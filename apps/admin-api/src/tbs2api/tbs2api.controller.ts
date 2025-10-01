import { UserCommonService } from '@domain/users/users.service';
import { WalletService } from '@domain/wallet/wallet.service';
import { Controller, Post, Body } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import Decimal from 'decimal.js';

@Controller('tbs2api')
export class Tbs2apiController {
  constructor(
    private readonly walletService: WalletService,
    private readonly userService: UserCommonService,
    private readonly prismaService: PrismaService,
  ) {}

  @Post('')
  async webhook(@Body() body: any) {
    const u = await this.userService.getUserById(body.login);
    if (!u) {
      return {
        status: 'fail',
        error: 'user_not_found',
      };
    }
    const balance = await this.walletService.getBalance(body.login);

    if (body.cmd == 'getBalance') {
      return {
        status: 'success',
        error: '',
        login: body.login,
        balance: balance.toFixed(2),
        currency: 'USD',
      };
    }

    if (body.cmd == 'writeBet') {
      const payload = {
        bet: new Decimal(body.bet),
        win: new Decimal(body.win),
      };

      if (balance.lessThan(payload.bet)) {
        return {
          status: 'fail',
          error: 'fail_balance',
        };
      }

      let newBalance = balance;
      if (payload.win.greaterThan(payload.bet)) {
        newBalance = await this.walletService.credit({
          amount: payload.win.minus(payload.bet),
          reason: 'spin-game',
          userId: body.login,
          idempotencyKey: body.tradeId,
          meta: body,
        });
      } else {
        newBalance = await this.walletService.debit({
          amount: payload.bet.minus(payload.win),
          reason: 'spin-game',
          userId: body.login,
          idempotencyKey: body.tradeId,
          meta: body,
        });
      }

      return {
        status: 'success',
        error: '',
        login: body.login,
        balance: newBalance.toFixed(2),
        currency: 'USD',
        operationId: body.tradeId,
      };
    }
  }
}
