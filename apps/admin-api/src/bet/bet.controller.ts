import { UserCommonService } from '@domain/users/users.service';
import { WalletService } from '@domain/wallet/wallet.service';
import { Controller, Post, Body, Get, Options, Res } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import Decimal from 'decimal.js';
import dayjs from 'dayjs';
import { md5, generateHmacResponse } from './utils';
import { ConfigService } from '@nestjs/config';

const generateHash = (session: string, dateTime: string, credit: number) => {
  return md5(session + dateTime + session + credit);
};

@Controller('bet')
export class BetController {
  constructor(
    private readonly walletService: WalletService,
    private readonly userService: UserCommonService,
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) { }

  @Options()
  preflight(@Res() res: Response) {
    return ''
  }

  @Get('')
  async hello() {
    return 'Hello GET';
  }

  @Post('')
  async webhook(@Body() body: any) {
    const secretKey = this.configService.getOrThrow<string>('SOFTGAMING_HMACSECRET');
    if (body.type === 'ping') {
      const responseBody = {
        status: 'OK',
      }
      return {
        ...responseBody,
        hmac: generateHmacResponse(responseBody, secretKey),
      };
    }
    if (body.type === 'balance') {
      const balance = await this.walletService.getBalance(body.userid);
      const responseBody = {
        status: 'OK',
        balance: balance.toFixed(2),
      };
      return {
        ...responseBody,
        hmac: generateHmacResponse(responseBody, secretKey),
      };
    }

    if (body.type === 'debit') {
      try {
        const balance = await this.walletService.debit({
          userId: body.userid,
          amount: new Decimal(body.amount),
          reason: 'BET_PLACE',
          idempotencyKey: body.tid?.toString() || body.i_actionid?.toString(),
          meta: {
            tid: body.tid,
            gameId: body.i_gameid,
            gameDesc: body.i_gamedesc,
            actionId: body.i_actionid,
          },
        });

        const responseBody = {
          status: 'OK',
          balance: balance.toFixed(2),
        };
        return {
          ...responseBody,
          hmac: generateHmacResponse(responseBody, secretKey),
        };
      } catch (error: any) {
        const balance = await this.walletService.getBalance(body.userid);
        const responseBody = {
          status: error?.message === 'Fondos insuficientes' ? 'FAIL' : 'ERROR',
          balance: balance.toFixed(2),
          error: error?.message || 'Unknown error',
        };
        return {
          ...responseBody,
          hmac: generateHmacResponse(responseBody, secretKey),
        };
      }
    }

    if (body.type === 'credit') {
      const balance = await this.walletService.credit({
        userId: body.userid,
        amount: new Decimal(body.amount),
        reason: 'BET_WIN',
        idempotencyKey: body.tid?.toString() || body.i_actionid?.toString(),
        meta: {
          tid: body.tid,
          gameId: body.i_gameid,
          gameDesc: body.i_gamedesc,
          actionId: body.i_actionid,
        },
      });

      const responseBody = {
        status: 'OK',
        balance: balance.toFixed(2),
      };
      return {
        ...responseBody,
        hmac: generateHmacResponse(responseBody, secretKey),
      };
    }

    if (body.type === 'rollback') {
      // Find the original transaction by TID in the ledger
      const tid = body.tid?.toString();
      const entry = await this.prismaService.ledgerEntry.findFirst({
        where: { idempotencyKey: tid },
      });

      if (!entry) {
        // If not found, it might have never reached us, so we return OK as if it was rolled back
        const balance = await this.walletService.getBalance(body.userid);
        const responseBody = {
          status: 'OK',
          balance: balance.toFixed(2),
        };
        return {
          ...responseBody,
          hmac: generateHmacResponse(responseBody, secretKey),
        };
      }

      // If already rolled back (we could tag it or just check if there's a rollback entry)
      const alreadyRolledBack = await this.prismaService.ledgerEntry.findFirst({
        where: { idempotencyKey: `rollback_${tid}` },
      });

      if (alreadyRolledBack) {
        const balance = await this.walletService.getBalance(body.userid);
        const responseBody = {
          status: 'OK',
          balance: balance.toFixed(2),
        };
        return {
          ...responseBody,
          hmac: generateHmacResponse(responseBody, secretKey),
        };
      }

      // Reverse it
      const amount = new Decimal(entry.amount).abs();
      let newBalance: Decimal;

      if (entry.amount.lt(0)) {
        // Original was debit, so we credit
        newBalance = await this.walletService.credit({
          userId: body.userid,
          amount,
          reason: 'ROLLBACK',
          idempotencyKey: `rollback_${tid}`,
          meta: { originalTid: tid },
        });
      } else {
        // Original was credit, so we debit
        newBalance = await this.walletService.debit({
          userId: body.userid,
          amount,
          reason: 'ROLLBACK',
          idempotencyKey: `rollback_${tid}`,
          meta: { originalTid: tid },
        });
      }

      const responseBody = {
        status: 'OK',
        balance: newBalance.toFixed(2),
      };
      return {
        ...responseBody,
        hmac: generateHmacResponse(responseBody, secretKey),
      };
    }
  }
}
