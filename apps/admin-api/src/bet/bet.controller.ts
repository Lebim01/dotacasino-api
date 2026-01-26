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
    console.log('Hello GET');
    return 'Hello GET';
  }

  @Post('')
  async webhook(@Body() body: any) {
    console.log('webhook recived type =>', body.type);
    console.time('webhook');
    const response = await this.processWebhook(body);

    // Logging is performed asynchronously to minimize response latency
    this.prismaService.softgamingWebhookLog.create({
      data: {
        requestBody: body,
        responseBody: response as any,
      },
    }).catch((err) => {
      console.error('Failed to log Softgaming webhook:', err);
    });

    console.timeEnd('webhook');

    return response;
  }

  private async processWebhook(body: any) {
    const secretKey = this.configService.getOrThrow<string>('SOFTGAMING_HMACSECRET');

    // Validate Idempotency (i_actionid) and TID consistency
    if(body.type == 'debit') {
      console.time('validate-idempotency');
    }
    if (body.i_actionid && (body.type === 'debit' || body.type === 'credit')) {
      const actionIdStr = body.i_actionid.toString();
      const idempotencyKey = body.subtype === 'cancel' ? `cancel_${actionIdStr}` : actionIdStr;

      const existingEntry = await this.prismaService.ledgerEntry.findFirst({
        where: {
          OR: [
            { idempotencyKey },
            body.tid ? { tid: body.tid.toString() } : {}
          ].filter(o => Object.keys(o).length > 0)
        },
        select: { idempotencyKey: true, tid: true, meta: true, balanceAfter: true, amount: true }
      });

      if (existingEntry) {
        // 1. Caso: El i_actionid ya existe (Idempotencia pura)
        if (existingEntry.idempotencyKey === idempotencyKey) {
          // Validamos que el monto sea el mismo (consistencia)
          const amount = new Decimal(body.amount);
          const prevAmount = new Decimal(existingEntry.amount || 0).abs();
          
          if (!prevAmount.equals(amount)) {
            const balance = await this.walletService.getBalance(body.userid);
            const responseBody = { error: 'Transaction Failed', balance: balance.toFixed(2) };
            return { ...responseBody, hmac: generateHmacResponse(responseBody, secretKey) };
          }

          const responseBody = {
            status: 'OK',
            balance: new Decimal(existingEntry.balanceAfter || 0).toFixed(2),
            tid: body.tid || existingEntry.tid
          };
          return { ...responseBody, hmac: generateHmacResponse(responseBody, secretKey) };
        }

        // 2. Caso: El TID ya existe pero con otro actionId (Inconsistencia de Softgaming)
        const meta = existingEntry.meta as any;
        if (meta.actionId?.toString() !== actionIdStr) {
          const balance = await this.walletService.getBalance(body.userid);
          const responseBody = { error: 'Transaction Failed', balance: balance.toFixed(2) };
          return { ...responseBody, hmac: generateHmacResponse(responseBody, secretKey) };
        }
      }
    }
    if(body.type == 'debit') {
      console.timeEnd('validate-idempotency');
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
    if(body.type == 'debit') {
      console.time('validate-user');
    }
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
    if(body.type == 'debit') {
      console.timeEnd('validate-user');
    }

    // Validate Currency
    if(body.type == 'debit') {
      console.time('validate-currency');
    }
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
    if(body.type == 'debit') {
      console.timeEnd('validate-currency');
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

    // Validate Debit
    if (body.type === 'debit') {
      const start = Date.now();
      try {
        const isCancel = body.subtype === 'cancel';
        const balance = await this.walletService.debit({
          userId: body.userid,
          amount: new Decimal(body.amount),
          reason: isCancel ? 'BET_CANCEL' : 'BET_PLACE',
          idempotencyKey: isCancel ? `cancel_${body.i_actionid}` : body.i_actionid?.toString(),
          tid: body.tid,
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
      } finally {
        const end = Date.now();
        console.log(`validate-debit: ${end - start}ms`);
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

    const responseBody = {
      error: 'Invalid Request',
    };
    return {
      ...responseBody,
      hmac: generateHmacResponse(responseBody, secretKey),
    };
  }
}



