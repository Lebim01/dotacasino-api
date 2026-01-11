import { Injectable } from '@nestjs/common';
import {
  CreateHallDto,
  GameSessionLogDto,
  GamesListDto,
  GetBalanceDto,
  OpenGameDto,
  WriteBetDto,
} from './dto';
import { HttpService } from '@nestjs/axios';
import { GamesApiResponse } from './dto/games.response';
import { firstValueFrom } from 'rxjs';
import { BalanceApiResponse } from './dto/balance.response';
import { OpenGameApiResponse } from './dto/opengame.response';
import { WriteBetApiResponse } from './dto/writebet.response';
import { PrismaService } from 'libs/db/src/prisma.service';
import { HistoryApiResponse } from './dto/history.response';
import { BET_CURRENCY, DOMAINS } from 'libs/shared/src/domains';

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

  async gameList(payload: GamesListDto, domain: string) {
    const hall = DOMAINS[domain];
    const { data } = await firstValueFrom(
      this.api.post<GamesApiResponse>(hall.api, {
        ...this.params,
        hall: hall.id,
        key: hall.key,
        cmd: 'gamesList',
      }),
    );

    return data;
  }

  async openGame(gameId: string, domain: string, userId: string) {
    const hall = DOMAINS[domain]
    console.log({
      ...this.params,
      cmd: 'openGame',
      domain,
      exitUrl: `https://${domain}/exit`,
      language: hall.lang,
      continent: hall.continent,
      login: userId,
      gameId,
      //cdnUrl: `${domain}/resources`,
      demo: '0',
    })
    const { data } = await firstValueFrom(
      this.api.post<OpenGameApiResponse, OpenGameDto>('openGame/', {
        ...this.params,
        cmd: 'openGame',
        domain: 'https://dotamx.com',
        exitUrl: `https://${domain}/exit`,
        language: 'en',
        continent: hall.continent,
        login: userId,
        gameId,
        //cdnUrl: `${domain}/resources`,
        demo: '0',
      }),
    );
    console.log(data)
    return data;
  }

  async getHistoryGames(sessionId: string, page = 1, limit = 10) {
    const { data } = await firstValueFrom(
      this.api.post<HistoryApiResponse>('', {
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
  async getBalance(login: string) {
    const { data } = await firstValueFrom(
      this.api.post<BalanceApiResponse, GetBalanceDto>('', {
        ...this.params,
        cmd: 'getBalance',
        login,
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

  async createHall(login: string) {
    const { data } = await firstValueFrom(
      this.api.post<any, CreateHallDto>('', {
        ...this.params,
        cmd: 'createHall',
        api_key: '',
        agent: '',
        currency: BET_CURRENCY,
        host: 'https://api.dotamx.com',
        login,
      }),
    );
    return data;
  }

  async sessionLogs(sessionsId: string) {
    const { data } = await firstValueFrom(
      this.api.post<any, GameSessionLogDto>('', {
        ...this.params,
        cmd: 'gameSessionsLog',
        sessionsId,
        count: 10,
        page: 0,
      }),
    );
    return data;
  }
}
