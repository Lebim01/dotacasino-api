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
import { USER_ROLES } from '../auth/auth.constants';
import { AuthService } from '../auth/auth.service';
import { validatePageAndLimit } from '../utils/pagination';
import { RolesGuard } from '@security/roles.guard';
import { JwtAuthGuard } from '@security/jwt.guard';
import { Roles } from '@security/roles.decorator';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly authService: AuthService,
  ) {}

  @ApiOperation({ summary: 'Get users to pay' })
  @Get('estimated-pay-rewards')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  getestimatedpayrewards() {
    return this.adminService.getEstimatedPayRewards();
  }

  @ApiOperation({ summary: 'Get users to pay' })
  @Get('next-week-pay-rewards')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  getnextestimatedpayrewards() {
    return this.adminService.getNextEstimatedPayRewards();
  }

  @ApiOperation({ summary: 'Get users to pay' })
  @Get('pay-rewards')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  getpayrewards() {
    return this.adminService.getPayRewards();
  }

  @ApiOperation({ summary: 'Pay' })
  @Post('pay-rewards')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  payrewards(@Body() body: PayReward) {
    return this.adminService.payReward(body.percent / 100);
  }

  @ApiOperation({ summary: 'Get pending withdraws' })
  @Get('withdraws')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  withdraws() {
    return this.adminService.withdraws();
  }

  @Get('history-admin-activations-with-volumen')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  adminactivations() {
    return this.adminService.historyAdminActivationWithVolumen();
  }

  @Get('history-admin-activations-without-volumen')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  adminactivationswithout() {
    return this.adminService.historyAdminActivationWithoutVolumen();
  }

  @ApiOperation({ summary: 'Add binary points to user' })
  @Post('add-points')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  async addpoints(@Body() body: AddPointsDTO) {
    const user = await this.authService.getUserByEmail(body.email);
    if (user) {
      return this.adminService.addPoints(user.id, body.side, body.points);
    }

    throw new HttpException('User not exists', 401);
  }

  @ApiOperation({ summary: 'Get history binary points to user' })
  @Get('history-add-points')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  historyadminaddpoints() {
    return this.adminService.getHistoryAdminAddPoints();
  }

  @ApiOperation({ summary: 'Block user' })
  @Post('block-user')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  blockuser(@Body() body: EmailUserDTO) {
    return this.adminService.blockuser(body.email);
  }

  @ApiOperation({ summary: 'Change user email' })
  @Post('change-user-email')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  changeuseremail(@Body() body: ChangeEmailUserDTO) {
    return this.adminService.changeEmailUser(body.old_email, body.new_email);
  }

  @ApiOperation({ summary: 'Change user password' })
  @Post('change-user-password')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  changeuserpassword(@Body() body: ChangePasswordUserDTO) {
    return this.adminService.changePasswordUser(body.email, body.password);
  }

  @Post('withdraws/:id_withdraw/paid')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  markpaidwithdraw(@Param('id_withdraw') id_withdraw: string) {
    return this.adminService.paidWithdraw(id_withdraw);
  }

  @Post('withdraws/:id_withdraw/deny')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  denywithdraw(@Param('id_withdraw') id_withdraw: string) {
    return this.adminService.denyWithdraw(id_withdraw);
  }

  @Get('coinpayments-transactions')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
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
