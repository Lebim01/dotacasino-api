import { UserCommonService } from '@domain/users/users.service';
import { WalletService } from '@domain/wallet/wallet.service';
import { Controller, Post, Body, Get, Options, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import Decimal from 'decimal.js';
import dayjs from 'dayjs';
import { md5, generateHmacResponse } from './utils';
import { ConfigService } from '@nestjs/config';
import { BetWebhookDto } from './dto/bet-webhook.dto';
import { Currency } from '@prisma/client';

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
  @HttpCode(HttpStatus.OK)
  async webhook(@Body() body: BetWebhookDto) {
    console.log('webhook recived type =>', body.type);
    const response = await this.processWebhook(body);

    // Logging is performed asynchronously to minimize response latency
    this.prismaService.softgamingWebhookLog.create({
      data: {
        requestBody: body as any,
        responseBody: response as any,
      },
    }).catch((err) => {
      console.error('Failed to log Softgaming webhook:', err);
    });

    return response;
  }

  private parseWebhookCurrency(currency?: string): Currency | null {
    if (!currency) return null;
    const normalized = currency.trim().toUpperCase();
    return (Object.values(Currency) as string[]).includes(normalized)
      ? (normalized as Currency)
      : null;
  }

  private async processWebhook(body: BetWebhookDto) {
    const secretKey = this.configService.getOrThrow<string>('SOFTGAMING_HMACSECRET');
    const requestedCurrency = this.parseWebhookCurrency(body.currency);

    if (body.type === 'ping') {
      const responseBody = {
        status: 'OK',
      }
      return {
        ...responseBody,
        hmac: generateHmacResponse(responseBody, secretKey),
      };
    }

    // Validate Idempotency (i_actionid) and TID consistency
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
          const amount = new Decimal(body.amount!);
          const prevAmount = new Decimal(existingEntry.amount || 0).abs();
          
          if (!prevAmount.equals(amount)) {
            const balance = await this.walletService.getBalance(
              body.userid!,
              requestedCurrency ?? undefined,
            );
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
          const balance = await this.walletService.getBalance(
            body.userid!,
            requestedCurrency ?? undefined,
          );
          const responseBody = { error: 'Transaction Failed', balance: balance.toFixed(2) };
          return { ...responseBody, hmac: generateHmacResponse(responseBody, secretKey) };
        }
      }
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
      if (!requestedCurrency) {
        const balance = await this.walletService.getBalance(body.userid!);
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
      const balance = await this.walletService.getBalance(
        body.userid!,
        requestedCurrency ?? undefined,
      );
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
      try {
        const isCancel = body.subtype === 'cancel';
        const balance = await this.walletService.debit({
          userId: body.userid!,
          amount: new Decimal(body.amount!),
          currency: requestedCurrency ?? undefined,
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
        console.log(error)
        const balance = await this.walletService.getBalance(
          body.userid!,
          requestedCurrency ?? undefined,
        );
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
          userId: body.userid!,
          amount: new Decimal(body.amount!),
          currency: requestedCurrency ?? undefined,
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
        const balance = await this.walletService.getBalance(
          body.userid!,
          requestedCurrency ?? undefined,
        );
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



