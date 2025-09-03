import { Injectable } from '@nestjs/common';
import { GamesListDto, OpenGameDto, WriteBetDto } from './dto';
import { HttpService } from '@nestjs/axios';
import { GamesApiResponse } from './dto/games.response';
import { firstValueFrom } from 'rxjs';
import { BalanceApiResponse } from './dto/balance.response';
import { OpenGameApiResponse } from './dto/opengame.response';

@Injectable()
export class BetService {
  private params: {
    hall: string;
    key: string;
  };

  constructor(private readonly api: HttpService) {
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

  async openGame(domain: string, gameId: string) {
    const { data } = await firstValueFrom(
      this.api.post<OpenGameApiResponse, OpenGameDto>('openGame/', {
        ...this.params,
        cmd: 'openGame',
        domain,
        exitUrl: `${domain}/close.php`,
        language: 'en',
        continent: 'eur',
        login: 'TBSArs2716USD',
        gameId,
        cdnUrl: `${domain}/exit`,
        demo: '1',
      }),
    );

    return data;
  }

  async getHistoryGames() {
    const { data } = await firstValueFrom(
      this.api.post('', {
        ...this.params,
        cmd: 'gameSessionsLog',
        sessionsId: 'session id(string)',
        count: ' row count in page(int)',
        page: 'page number(int)',
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

  async writeBet() {
    const { data } = await firstValueFrom(
      this.api.post<BalanceApiResponse>('writeBet', {
        ...this.params,
        cmd: 'writeBet',
        login: 'test',

        bet: '',
      }),
    );
    return data;
  }
}
