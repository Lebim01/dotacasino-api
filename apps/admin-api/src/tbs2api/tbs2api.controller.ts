import { UserCommonService } from '@domain/users/users.service';
import { WalletService } from '@domain/wallet/wallet.service';
import { Controller, Post, Body } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import Decimal from 'decimal.js';
import dayjs from 'dayjs';
import { md5 } from './utils';

const generateHash = (session: string, dateTime: string, credit: number) => {
  return md5(session + dateTime + session + credit);
};

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

      const ticket = await this.prismaService.betTicket.create({
        data: {
          gameId: body.gameId,
          stake: payload.bet,
          status: 'SETTLED',
          userId: body.login,
          payout: payload.win,
          meta: body,
          idempotencyKey: body.tradeId,
        },
      });

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
          meta: { ticket_id: ticket.id, ...body },
        });
      } else {
        newBalance = await this.walletService.debit({
          amount: payload.bet.minus(payload.win),
          reason: 'spin-game',
          userId: body.login,
          idempotencyKey: body.tradeId,
          meta: { ticket_id: ticket.id, ...body },
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

  @Post('testing')
  async testing(@Body() body: any) {
    if (body.cmd == 'sessionInfo') {
      return {
        status: 'success',
        microtime: 0.001423,
        dateTime: '2025-10-02 02:21:04',
        error: null,
        content: {
          cmd: 'sessionInfo',
          serverMathematics: null,
          serverResources: null,
          sessionId: body.session,
          exitUrl: 'https:\/\/dotacasino-front.vercel.app\/exit',
          id: '306',
          name: 'Golf Keno',
          currency: 'USD',
          language: 'en',
          type: 'fox',
          systemName: 'golf_keno',
          version: 0,
          mobile: 1,
          denomination: '',
        },
      };
    }

    if (body.cmd == 'gameInit') {
      return {
        status: 'success',
        microtime: 0.23475909233093,
        dateTime: '2025-10-02 02:42:21',
        error: '',
        content: {
          cmd: 'gameInit',
          credit: 9730,
          currency: 'USD',
          session: '40612265_bd3adb10d9452109a9dae404012d5d4a',
          betInfo: {
            denomination: 0.01,
            bet: 10,
            lines: 1,
          },
          betSettings: {
            denomination: [0.01],
            bets: [
              10, 20, 30, 40, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900,
              1000, 2000, 3000,
            ],
            lines: [1],
          },
          payTable: {
            '2': {
              '1': 1,
              '2': 9,
            },
            '3': {
              '2': 2,
              '3': 47,
            },
            '4': {
              '2': 2,
              '3': 5,
              '4': 91,
            },
            '5': {
              '3': 3,
              '4': 12,
              '5': 820,
            },
            '6': {
              '3': 3,
              '4': 4,
              '5': 70,
              '6': 1600,
            },
            '7': {
              '3': 1,
              '4': 2,
              '5': 21,
              '6': 400,
              '7': 7000,
            },
            '8': {
              '4': 2,
              '5': 12,
              '6': 100,
              '7': 1650,
              '8': 10000,
            },
            '9': {
              '4': 1,
              '5': 6,
              '6': 44,
              '7': 335,
              '8': 4700,
              '9': 10000,
            },
            '10': {
              '5': 5,
              '6': 24,
              '7': 142,
              '8': 1000,
              '9': 4500,
              '10': 10000,
            },
          },
          exitUrl: 'https:\/\/dotacasino-front.vercel.app\/exit',
          pingInterval: 20000,
          restore: false,
          hash: '6e50d8682e9a547ebd1ef8553c7a792d',
        },
      };
    }

    if (body.cmd == 'gamePing') {
      return {
        status: 'success',
        microtime: 0.0014660358428955,
        dateTime: '2025-10-02 02:42:41',
        error: null,
        content: {
          cmd: 'gamePing',
          session: '40612265_bd3adb10d9452109a9dae404012d5d4a',
          hash: 'b6902b14aeadb8aaa32fc9844cea8ade',
        },
      };
    }

    if (body.cmd == 'gameSpin') {
      const dateTime = dayjs().format('YYYY-MM-DD HH:MM:ss');
      const credit = 9720;
      return {
        status: 'success',
        microtime: 0.23807787895203,
        dateTime,
        error: null,
        content: {
          session: body.session,
          cmd: 'gameSpin',
          credit,
          creditWin: '0',
          numbers: [
            38, 69, 32, 64, 58, 19, 21, 11, 34, 14, 74, 61, 77, 48, 79, 40, 41,
            57, 56, 53,
          ],
          matches: 0,
          hash: generateHash(body.session, dateTime, credit),
        },
      };
    }
  }
}
