import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { ChangePasswordDTO, CreateWithdrawDTO } from './dto/users.dto';
import { HasRoles } from '../auth/roles/roles.decorator';
import { USER_ROLES } from '../auth/auth.constants';
import { JWTAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import {
  ChangeProfileDTO,
  RecoverOTPDTO,
  RecoverPassDTO,
} from './dto/recover-pass.dto';
import { AuthService } from '../auth/auth.service';
import { RequestWithUser } from '../types/jwt';
import {
  CreateTransactionDto,
  CreateTransactionMembershipDto,
} from '../coinpayments/dto/create-transaction.dto';
import { validatePageAndLimit } from '../utils/pagination';
import { db } from '../firebase/admin';
import { DisruptiveService } from '../disruptive/disruptive.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly disruptiveService: DisruptiveService,
  ) {}

  @ApiExcludeEndpoint()
  @Get('/')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get all users [ADMIN]' })
  @ApiQuery({
    name: 'page',
    required: false,
    example: '1',
    schema: { type: 'number', minimum: 1 },
    description: 'Page number. Default 1.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: '10',
    schema: { type: 'number', minimum: 1, maximum: 500 },
    description: 'Limit of users per page. Max 500. Default 10.',
  })
  async getUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    //@Query('q') query = '',
  ) {
    const _page = parseInt(page);
    const _limit = parseInt(limit);

    const hasError = validatePageAndLimit(_page, _limit);
    if (hasError) throw new HttpException(hasError.message, 400);

    return this.usersService.getUsers(_page, _limit);
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Get the logged user info' })
  async getMe(@Request() request: RequestWithUser) {
    const { id } = request.user;
    const user = await this.usersService.getUserById(id, true);
    return user;
  }

  @Post('recover/otp')
  @ApiOperation({ summary: 'Recover user password' })
  async recoverotp(@Body() body: RecoverOTPDTO) {
    const { email } = body;

    const OTP = this.authService.generateOTP();
    await this.authService.createOTPNode(email, OTP);
    return await this.usersService.sendRecoverPassEmail(email, OTP);
  }

  @Post('otp')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Recover user password' })
  async otp(@Request() req: RequestWithUser) {
    const user = await db.collection('users').doc(req.user.id).get();
    const OTP = this.authService.generateOTP();
    await this.authService.createOTPNode(user.get('email'), OTP);
    return await this.usersService.sendOTP(user.get('email'), OTP);
  }

  @Post('recover/password')
  @ApiOperation({ summary: 'Recover user password' })
  async recoverPassword(@Body() body: RecoverPassDTO) {
    const { email, password, otp = undefined } = body;
    const isValidOTP = await this.authService.verifyOTP(email, otp);

    if (!isValidOTP) {
      throw new HttpException('INVALID_OTP', 403);
    }

    return await this.usersService.changePassword(email, password);
  }

  @Post('update')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(
    @Request() req: RequestWithUser,
    @Body() body: ChangeProfileDTO,
  ) {
    return this.usersService.updateUserProfile(req.user.id, body);
  }

  @Get('direct-tree')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Get user direct tree' })
  async getDirectTree(@Request() request: RequestWithUser) {
    const { id } = request.user;
    return await this.usersService.getDirectTree(id);
  }

  @Get('get-one/:userId')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Get user by id' })
  async getOne(
    @Request() request: RequestWithUser,
    @Param('userId') userId: string,
  ) {
    return await this.usersService.getUserById(userId);
  }

  @Post('create-qr-membership')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Create QR payment' })
  async createqrmembership(
    @Request() request: RequestWithUser,
    @Body()
    body: CreateTransactionMembershipDto,
  ) {
    const { id } = request.user;

    await this.usersService.createMembershipQR(id, body.membership_type);

    return this.usersService.getQRMembership(id);
  }

  @Post('create-qr-deposit')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Create QR payment' })
  async createqrdeposit(
    @Request() request: RequestWithUser,
    @Body()
    body: CreateTransactionDto,
  ) {
    const { id } = request.user;
    const user = await db.collection('users').doc(id).get();

    if (user.get('membership_status') != 'paid') {
      throw new HttpException('Membership active is required', 403);
    }

    const current = await this.usersService.currentDeposit(id);

    if ((current.deposits || 0) + (body.amount || 0) > current.limit) {
      throw new HttpException('Invalid amount', 403);
    }

    await this.disruptiveService.createDeposit(id, body.amount);
    return this.usersService.getQRDeposit(id);
  }

  @Get('qr-membership')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Get QR payment' })
  async getqrmembership(@Request() request: RequestWithUser) {
    const { id } = request.user;
    return this.usersService.getQRMembership(id);
  }

  @Get('qr-deposit')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Get QR payment' })
  async getqrdeposit(@Request() request: RequestWithUser) {
    const { id } = request.user;
    return this.usersService.getQRDeposit(id);
  }

  @Delete('qr-membership')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Get QR payment' })
  async deleteqrmembership(@Request() request: RequestWithUser) {
    const { id } = request.user;
    return this.usersService.deleteQRMembership(id);
  }

  @Delete('qr-deposit')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Get QR payment' })
  async deleteqrdeposit(@Request() request: RequestWithUser) {
    const { id } = request.user;
    return this.usersService.deleteQRDeposit(id);
  }

  @Get('current-deposit')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Get current deposits value' })
  async currentDeposit(@Request() request: RequestWithUser) {
    const { id } = request.user;
    return this.usersService.currentDeposit(id);
  }

  @Get('current-multiplier')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Get current deposits value' })
  async currentMultiplier(@Request() request: RequestWithUser) {
    const { id } = request.user;
    return this.usersService.currentMultiplier(id);
  }

  @Get('deposits')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Get history deposits' })
  async deposits(@Request() request: RequestWithUser) {
    const { id } = request.user;
    return this.usersService.deposits(id);
  }

  @Get('my-direct-users')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Get list of my direct users' })
  async myusers(@Request() request: RequestWithUser) {
    const { id } = request.user;
    return this.usersService.directs(id);
  }

  @Get('reference/:userid/:position')
  async reference(
    @Param('userid') userid: string,
    @Param('position') position: string,
  ) {
    return this.usersService.referenceLink(userid, position);
  }

  @Get('profits-stats')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Get list of my direct users' })
  profitsstats(@Request() request: RequestWithUser) {
    const { id } = request.user;
    return this.usersService.getProfitsStats(id);
  }

  @Get('profits-list')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Get list of my direct users' })
  @ApiQuery({
    name: 'page',
    required: false,
    example: '1',
    schema: { type: 'number', minimum: 1 },
    description: 'Page number. Default 1.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: '10',
    schema: { type: 'number', minimum: 1, maximum: 500 },
    description: 'Limit of users per page. Max 500. Default 10.',
  })
  getlistprofits(
    @Request() request: RequestWithUser,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const _page = parseInt(page);
    const _limit = parseInt(limit);

    const hasError = validatePageAndLimit(_page, _limit);
    if (hasError) throw new HttpException(hasError.message, 400);

    const { id } = request.user;
    return this.usersService.getListProfits(id, _page, _limit);
  }

  @Get('current-membership')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  async currentmembership(@Request() request: RequestWithUser) {
    const { id } = request.user;
    const user = await db.collection('users').doc(id).get();
    return {
      membership: user.get('membership'),
    };
  }

  @Post('create-withdraw')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  async createwithdraw(
    @Request() request: RequestWithUser,
    @Body() body: CreateWithdrawDTO,
  ) {
    const { id } = request.user;

    if (body.amount < 20) {
      throw new HttpException('Minimo 20 usd', 401);
    }

    if (!(await this.usersService.verifyOTP(id, body.otp))) {
      throw new HttpException('OTP invalid', 401);
    }

    return this.usersService.createwithdraw(
      id,
      body.amount,
      body.type,
      body.deposit_id,
    );
  }

  @Get('get-balance')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  async getbalance(@Request() request: RequestWithUser) {
    const { id } = request.user;
    const user = await db.collection('users').doc(id).get();

    const bonds = ['bond_direct', 'bond_binary', 'bond_rewards', 'bond_ranks'];

    const data = [];

    for (const key of bonds) {
      data.push({
        key,
        balance: user.get(`balance_${key}`) - (user.get(`pending_${key}`) || 0),
        pending: user.get(`pending_${key}`),
      });
    }

    return data;
  }

  @Get('withdraw-history')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  async withdrawhistory(@Request() request: RequestWithUser) {
    const { id } = request.user;
    return this.usersService.withdrawhistory(id);
  }

  @Post('change-password')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  changepassword(
    @Request() request: RequestWithUser,
    @Body() body: ChangePasswordDTO,
  ) {
    const { id } = request.user;
    return this.usersService.changepassword(
      id,
      body.previous_password,
      body.new_password,
    );
  }

  @Get('nft')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  getnft(@Request() request: RequestWithUser) {
    const { id } = request.user;
    return this.usersService.getNft(id);
  }

  @Post('nft-reclaim')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  reclaimnft(@Request() request: RequestWithUser) {
    const { id } = request.user;
    return this.usersService.reclaimNft(id);
  }
}
