import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@security/jwt.guard';
import { CurrentUser } from '@security/current-user.decorator';
import { RequestDTO } from './dto/withdraw.dto';
import { NodePaymentsService } from '@domain/node-payments/node-payments.service';
import { WalletService } from '@domain/wallet/wallet.service';

@ApiTags('Withdraw Coins')
@Controller('withdraw-coins')
export class WithdrawCoinsController {
  constructor(
    private readonly nodePaymentsService: NodePaymentsService,
    private readonly walletService: WalletService,
  ) {}

  @Get('list')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get history' })
  getlist(@CurrentUser() user: { userId: string }) {
    return this.nodePaymentsService.getWithdrawList(user.userId);
  }

  @Post('create')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: RequestDTO })
  @ApiOperation({ summary: 'Create request' })
  async createqrmembership(
    @CurrentUser() user: { userId: string },
    @Body() body: RequestDTO,
  ) {
    const balance = await this.walletService.getBalance(user.userId);
    const pending = await this.walletService.getPendingAmount(user.userId);
    if (balance >= body.amount + pending) {
      await this.nodePaymentsService.requestWithdraw(
        user.userId,
        body.amount,
        body.address,
      );
      return {
        status: true,
        message: 'request_withdraw_success',
      };
    } else {
      return {
        status: false,
        message: 'not_enought_balance',
      };
    }
  }

  @Delete('cancel')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel current' })
  async deleteqr(@CurrentUser() user: { userId: string }) {
    return this.nodePaymentsService.cancelWithdrawCasino(user.userId);
  }
}
