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

    // Validate TID consistency: A TID must always belong to the same Action ID
    if (body.tid && body.i_actionid && (body.type === 'debit' || body.type === 'credit')) {
      const actionIdStr = body.i_actionid.toString();

      // Search for any ledger entry that has this tid in its meta
      // We check both number and string because Prisma JSON filtering is type-sensitive
      const existingTransaction = await this.prismaService.ledgerEntry.findFirst({
        where: {
          OR: [
            { meta: { path: ['tid'], equals: body.tid } },
            { meta: { path: ['tid'], equals: body.tid.toString() } },
          ],
        },
      });

      if (existingTransaction) {
        const meta = existingTransaction.meta as any;
        if (meta.actionId?.toString() !== actionIdStr) {
          const balance = await this.walletService.getBalance(body.userid);
          const responseBody = {
            error: 'Transaction Failed',
            balance: balance.toFixed(2),
          };
          return {
            ...responseBody,
            hmac: generateHmacResponse(responseBody, secretKey),
          };
        }
      }
    }

    if (body.type === 'ping') {
      const responseBody = {
        status: 'OK',
      }
      return {
        ...responseBody,
        hmac: generateHmacResponse(responseBody, secretKey),
      };
    }

    // Validate User existence for types that require it
    if (body.userid && (body.type === 'balance' || body.type === 'debit' || body.type === 'credit')) {
      const user = await this.prismaService.user.findUnique({
        where: { id: body.userid },
      });

      if (!user) {
        const responseBody = {
          error: 'Invalid userid',
        };
        return {
          ...responseBody,
          hmac: generateHmacResponse(responseBody, secretKey),
        };
      }
    }

    // Validate Currency
    if (body.currency && (body.type === 'balance' || body.type === 'debit' || body.type === 'credit')) {
      if (body.currency !== 'USD') {
        const balance = await this.walletService.getBalance(body.userid);
        const responseBody = {
          error: 'Invalid currency',
          balance: balance.toFixed(2),
        };
        return {
          ...responseBody,
          hmac: generateHmacResponse(responseBody, secretKey),
        };
      }
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
          idempotencyKey: body.i_actionid?.toString(),
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
          tid: body.tid,
        };
        return {
          ...responseBody,
          hmac: generateHmacResponse(responseBody, secretKey),
        };
      } catch (error: any) {
        const balance = await this.walletService.getBalance(body.userid);
        const errorMsg = error?.message === 'Fondos insuficientes' ? 'INSUFFICIENT_FUNDS' :
          error?.message === 'Inconsistent idempotency: amount mismatch' ? 'Transaction Failed' :
            'ERROR';
        const responseBody = {
          error: errorMsg,
          balance: balance.toFixed(2),
        };
        return {
          ...responseBody,
          hmac: generateHmacResponse(responseBody, secretKey),
        };
      }
    }

    if (body.type === 'credit') {
      try {
        const isCancel = body.subtype === 'cancel';
        const balance = await this.walletService.credit({
          userId: body.userid,
          amount: new Decimal(body.amount),
          reason: isCancel ? 'BET_CANCEL' : 'BET_WIN',
          idempotencyKey: isCancel ? `cancel_${body.i_actionid}` : body.i_actionid?.toString(),
          meta: {
            tid: body.tid,
            gameId: body.i_gameid,
            gameDesc: body.i_gamedesc,
            actionId: body.i_actionid,
            subtype: body.subtype,
          },
        });

        const responseBody = {
          status: 'OK',
          balance: balance.toFixed(2),
          tid: body.tid,
        };
        return {
          ...responseBody,
          hmac: generateHmacResponse(responseBody, secretKey),
        };
      } catch (error: any) {
        const balance = await this.walletService.getBalance(body.userid);
        const errorMsg = error?.message === 'Inconsistent idempotency: amount mismatch' ? 'Transaction Failed' :
          'ERROR';
        const responseBody = {
          error: errorMsg,
          balance: balance.toFixed(2),
        };
        return {
          ...responseBody,
          hmac: generateHmacResponse(responseBody, secretKey),
        };
      }
    }
  }
}
