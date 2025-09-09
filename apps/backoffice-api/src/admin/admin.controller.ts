import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import {
  AddPointsDTO,
  ChangeEmailUserDTO,
  ChangePasswordUserDTO,
  EmailUserDTO,
  PayReward,
  ProcessTransaction,
} from './dto/pay.dto';
import { ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { HasRoles } from '../auth/roles/roles.decorator';
import { USER_ROLES } from '../auth/auth.constants';
import { JWTAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { AuthService } from '../auth/auth.service';
import { validatePageAndLimit } from '../utils/pagination';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly authService: AuthService,
  ) {}

  @ApiOperation({ summary: 'Get users to pay' })
  @Get('estimated-pay-rewards')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  getestimatedpayrewards() {
    return this.adminService.getEstimatedPayRewards();
  }

  @ApiOperation({ summary: 'Get users to pay' })
  @Get('next-week-pay-rewards')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  getnextestimatedpayrewards() {
    return this.adminService.getNextEstimatedPayRewards();
  }

  @ApiOperation({ summary: 'Get users to pay' })
  @Get('pay-rewards')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  getpayrewards() {
    return this.adminService.getPayRewards();
  }

  @ApiOperation({ summary: 'Pay' })
  @Post('pay-rewards')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  payrewards(@Body() body: PayReward) {
    return this.adminService.payReward(body.percent / 100);
  }

  @ApiOperation({ summary: 'Exec coinpyaments with volumen' })
  @Post('coinpayments-process-transaction')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  processtransaction(@Body() body: ProcessTransaction) {
    return this.adminService.coinpaymentsProcessTransaction(body.txn_id);
  }

  @ApiOperation({ summary: 'Exec coinpyaments without volumen' })
  @Post('coinpayments-process-transaction-without-volumen')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  processtransactionwithoutvolumen(@Body() body: ProcessTransaction) {
    return this.adminService.coinpaymentsProcessTransactionWithoutVolumen(
      body.txn_id,
    );
  }

  @ApiOperation({ summary: 'Exec coinpyaments with volumen' })
  @Post('disruptive-process-transaction')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  disruptiveprocesstransaction(@Body() body: ProcessTransaction) {
    return this.adminService.disruptiveProcessTransaction(body.txn_id);
  }

  @ApiOperation({ summary: 'Exec coinpyaments without volumen' })
  @Post('disruptive-process-transaction-without-volumen')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  disruptiveprocesstransactionwithoutvolumen(@Body() body: ProcessTransaction) {
    return this.adminService.disruptiveProcessTransactionWithoutVolumen(
      body.txn_id,
    );
  }

  @ApiOperation({ summary: 'Get pending withdraws' })
  @Get('withdraws')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  withdraws() {
    return this.adminService.withdraws();
  }

  @Get('history-admin-activations-with-volumen')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  adminactivations() {
    return this.adminService.historyAdminActivationWithVolumen();
  }

  @Get('history-admin-activations-without-volumen')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  adminactivationswithout() {
    return this.adminService.historyAdminActivationWithoutVolumen();
  }

  @ApiOperation({ summary: 'Add binary points to user' })
  @Post('add-points')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  async addpoints(@Body() body: AddPointsDTO) {
    const user = await this.authService.getUserByEmail(body.email);
    if (user) {
      return this.adminService.addPoints(user.uid, body.side, body.points);
    }

    throw new HttpException('User not exists', 401);
  }

  @ApiOperation({ summary: 'Get history binary points to user' })
  @Get('history-add-points')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  historyadminaddpoints() {
    return this.adminService.getHistoryAdminAddPoints();
  }

  @ApiOperation({ summary: 'Block user' })
  @Post('block-user')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  blockuser(@Body() body: EmailUserDTO) {
    return this.adminService.blockuser(body.email);
  }

  @ApiOperation({ summary: 'Change user email' })
  @Post('change-user-email')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  changeuseremail(@Body() body: ChangeEmailUserDTO) {
    return this.adminService.changeEmailUser(body.old_email, body.new_email);
  }

  @ApiOperation({ summary: 'Change user password' })
  @Post('change-user-password')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  changeuserpassword(@Body() body: ChangePasswordUserDTO) {
    return this.adminService.changePasswordUser(body.email, body.password);
  }

  @Post('withdraws/:id_withdraw/paid')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  markpaidwithdraw(@Param('id_withdraw') id_withdraw: string) {
    return this.adminService.paidWithdraw(id_withdraw);
  }

  @Post('withdraws/:id_withdraw/deny')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  denywithdraw(@Param('id_withdraw') id_withdraw: string) {
    return this.adminService.denyWithdraw(id_withdraw);
  }

  @Get('coinpayments-transactions')
  @ApiBearerAuth('JWT-auth')
  @HasRoles(USER_ROLES.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  @ApiQuery({
    name: 'page',
    required: false,
    example: '1',
    schema: { type: 'number', minimum: 1 },
    description: 'Page number. Default 1.',
  })
  coinpaymentspaid(@Query('page') page = '1', @Query('limit') limit = '10') {
    const _page = parseInt(page);
    const _limit = parseInt(limit);

    const hasError = validatePageAndLimit(_page, _limit);
    if (hasError) throw new HttpException(hasError.message, 400);
    return this.adminService.coinpaymentsTransactions(_page, _limit);
  }
}
