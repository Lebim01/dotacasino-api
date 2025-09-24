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
import { USER_ROLES } from '../auth/auth.constants';
import {
  ChangeProfileDTO,
  RecoverOTPDTO,
  RecoverPassDTO,
} from './dto/recover-pass.dto';
import { AuthService } from '../auth/auth.service';
import {
  CreateTransactionDto,
  CreateTransactionMembershipDto,
} from '../coinpayments/dto/create-transaction.dto';
import { validatePageAndLimit } from '../utils/pagination';
import { db } from '../firebase/admin';
import { UserCommonService } from '@domain/users/users.service';
import { DisruptiveService } from '@domain/disruptive/disruptive.service';
import { JwtAuthGuard } from '@security/jwt.guard';
import { Roles } from '@security/roles.decorator';
import { CurrentUser } from '@security/current-user.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly commonUserService: UserCommonService,
    private readonly authService: AuthService,
    private readonly disruptiveService: DisruptiveService,
  ) {}

  @ApiExcludeEndpoint()
  @Get('/')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(USER_ROLES.ADMIN)
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
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the logged user info' })
  async getMe(@CurrentUser() { userId }: { userId: string }) {
    const user = await this.usersService.getUserById(userId, true);
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
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Recover user password' })
  async otp(@CurrentUser() { userId }: { userId: string }) {
    const user = await db.collection('users').doc(userId).get();
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
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(
    @CurrentUser() { userId }: { userId: string },
    @Body() body: ChangeProfileDTO,
  ) {
    return this.usersService.updateUserProfile(userId, body);
  }

  @Get('direct-tree')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user direct tree' })
  async getDirectTree(@CurrentUser() user: { userId: string }) {
    return await this.usersService.getDirectTree(user.userId);
  }

  @Get('get-one/:userId')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user by id' })
  async getOne(
    @CurrentUser() user: { userId: string },
    @Param('userId') userId: string,
  ) {
    return await this.usersService.getUserById(userId);
  }

  @Post('create-qr-membership')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create QR payment' })
  async createqrmembership(
    @CurrentUser() user: { userId: string },
    @Body()
    body: CreateTransactionMembershipDto,
  ) {
    await this.commonUserService.createMembershipQR(
      user.userId,
      body.membership_type,
    );

    return this.commonUserService.getQRMembership(user.userId);
  }

  @Post('create-qr-deposit')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create QR payment' })
  async createqrdeposit(
    @CurrentUser() { userId }: { userId: string },
    @Body()
    body: CreateTransactionDto,
  ) {
    const user = await db.collection('users').doc(userId).get();

    if (user.get('membership_status') != 'paid') {
      throw new HttpException('Membership active is required', 403);
    }

    const current = await this.usersService.currentDeposit(userId);

    if ((current.deposits || 0) + (body.amount || 0) > current.limit) {
      throw new HttpException('Invalid amount', 403);
    }

    await this.disruptiveService.createDeposit(userId, body.amount);
    return this.usersService.getQRDeposit(userId);
  }

  @Get('qr-membership')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get QR payment' })
  async getqrmembership(@CurrentUser() { userId }: { userId: string }) {
    return this.commonUserService.getQRMembership(userId);
  }

  @Get('qr-deposit')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get QR payment' })
  async getqrdeposit(@CurrentUser() { userId }: { userId: string }) {
    return this.usersService.getQRDeposit(userId);
  }

  @Delete('qr-membership')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get QR payment' })
  async deleteqrmembership(@CurrentUser() { userId }: { userId: string }) {
    return this.usersService.deleteQRMembership(userId);
  }

  @Delete('qr-deposit')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get QR payment' })
  async deleteqrdeposit(@CurrentUser() { userId }: { userId: string }) {
    return this.usersService.deleteQRDeposit(userId);
  }

  @Get('current-deposit')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current deposits value' })
  async currentDeposit(@CurrentUser() { userId }: { userId: string }) {
    return this.usersService.currentDeposit(userId);
  }

  @Get('current-multiplier')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current deposits value' })
  async currentMultiplier(@CurrentUser() { userId }: { userId: string }) {
    return this.usersService.currentMultiplier(userId);
  }

  @Get('deposits')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get history deposits' })
  async deposits(@CurrentUser() { userId }: { userId: string }) {
    return this.usersService.deposits(userId);
  }

  @Get('my-direct-users')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get list of my direct users' })
  async myusers(@CurrentUser() { userId }: { userId: string }) {
    return this.usersService.directs(userId);
  }

  @Get('reference/:userid/:position')
  async reference(
    @Param('userid') userid: string,
    @Param('position') position: string,
  ) {
    return this.usersService.referenceLink(userid, position);
  }

  @Get('profits-stats')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get list of my direct users' })
  profitsstats(@CurrentUser() { userId }: { userId: string }) {
    return this.usersService.getProfitsStats(userId);
  }

  @Get('profits-list')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
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
    @CurrentUser() { userId }: { userId: string },
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const _page = parseInt(page);
    const _limit = parseInt(limit);

    const hasError = validatePageAndLimit(_page, _limit);
    if (hasError) throw new HttpException(hasError.message, 400);

    return this.usersService.getListProfits(userId, _page, _limit);
  }

  @Get('current-membership')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async currentmembership(@CurrentUser() { userId }: { userId: string }) {
    const user = await db.collection('users').doc(userId).get();
    return {
      membership: user.get('membership'),
    };
  }

  @Post('create-withdraw')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async createwithdraw(
    @CurrentUser() { userId }: { userId: string },
    @Body() body: CreateWithdrawDTO,
  ) {
    if (body.amount < 20) {
      throw new HttpException('Minimo 20 usd', 401);
    }

    if (!(await this.usersService.verifyOTP(userId, body.otp))) {
      throw new HttpException('OTP invalid', 401);
    }

    return this.usersService.createwithdraw(
      userId,
      body.amount,
      body.type,
      body.deposit_id,
    );
  }

  @Get('get-balance')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async getbalance(@CurrentUser() { userId }: { userId: string }) {
    const user = await db.collection('users').doc(userId).get();

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
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async withdrawhistory(@CurrentUser() { userId }: { userId: string }) {
    return this.usersService.withdrawhistory(userId);
  }

  @Post('change-password')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  changepassword(
    @CurrentUser() { userId }: { userId: string },
    @Body() body: ChangePasswordDTO,
  ) {
    return this.usersService.changepassword(
      userId,
      body.previous_password,
      body.new_password,
    );
  }

  @Get('nft')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  getnft(@CurrentUser() { userId }: { userId: string }) {
    return this.usersService.getNft(userId);
  }

  @Post('nft-reclaim')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  reclaimnft(@CurrentUser() { userId }: { userId: string }) {
    return this.usersService.reclaimNft(userId);
  }
}
