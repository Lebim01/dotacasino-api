// src/games-api/games-api.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { validateSync, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import * as crypto from 'crypto';
import {
  CreateHallDto,
  Fail,
  GamesListDto,
  GetBalanceDto,
  OpenGameDto,
  SessionsLogDto,
  Success,
  WriteBetDto,
  ChangeHallConfigGetDto,
  ChangeHallConfigSetDto,
} from './dto';
import { HttpService } from '@nestjs/axios';
import { GamesApiResponse } from './dto/games.response';
import { firstValueFrom } from 'rxjs';

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

  async openGame() {
    const { data } = await firstValueFrom(
      this.api.post('', {
        ...this.params,
        cmd: 'openGame',

        domain: 'https://domain',
        exitUrl: 'https://domain/close.php',
        language: 'en',
        continent: 'eur',
        login: 'player_login',
        gameId: '1',
        cdnUrl: 'http://domain.com/resources',
        demo: '0',
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
  }
}
