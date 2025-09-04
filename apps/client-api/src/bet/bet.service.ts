import { Injectable } from '@nestjs/common';
import { GamesListDto, OpenGameDto, WriteBetDto } from './dto';
import { HttpService } from '@nestjs/axios';
import { GamesApiResponse } from './dto/games.response';
import { firstValueFrom } from 'rxjs';
import { BalanceApiResponse } from './dto/balance.response';
import { OpenGameApiResponse } from './dto/opengame.response';
import { WriteBetApiResponse } from './dto/writebet.response';
import { PrismaService } from 'libs/db/src/prisma.service';

@Injectable()
export class BetService {
  private params: {
    hall: string;
    key: string;
  };

  constructor(
    private readonly api: HttpService,
    private readonly prisma: PrismaService,
  ) {
    this.params = {
      hall: process.env.BET_HALL_ID as string,
      key: process.env.BET_HALL_KEY as string,
    };
  }

  async gameList(payload: GamesListDto) {
    const { data } = await firstValueFrom(
      this.api.post<GamesApiResponse>('', {
        ...payload,
        ...this.params,
        cmd: 'gamesList',
      }),
    );

    return data;
  }

  async openGame(domain: string, gameId: string, userId: string) {
    const { data } = await firstValueFrom(
      this.api.post<OpenGameApiResponse, OpenGameDto>('openGame/', {
        ...this.params,
        cmd: 'openGame',
        domain,
        exitUrl: `${domain}/close.php`,
        language: 'en',
        continent: 'eur',
        login: userId,
        gameId,
        cdnUrl: `${domain}/exit`,
        demo: '1',
      }),
    );

    return data;
  }

  async getHistoryGames(sessionId: string, page = 1, limit = 10) {
    const { data } = await firstValueFrom(
      this.api.post('', {
        ...this.params,
        cmd: 'gameSessionsLog',
        sessionsId: sessionId,
        count: limit,
        page: page,
      }),
    );
    return data;
  }

  // (recibir el saldo en balance para el jugador)
  async getBalance() {
    const { data } = await firstValueFrom(
      this.api.post<BalanceApiResponse>('', {
        ...this.params,
        cmd: 'getBalance',
        login: 'test',
      }),
    );
    return data;
  }

  async writeBet(userId: string, sessionId: string, gameId: string) {
    const { data } = await firstValueFrom(
      this.api.post<WriteBetApiResponse, WriteBetDto>('writeBet', {
        ...this.params,
        cmd: 'writeBet',
        login: userId,
        sessionId,
        gameId,
        bet: '100',
        win: '0',
        betInfo: 'bet',
        tradeId: '9999',
      }),
    );
    return data.status == 'success';
  }
}
