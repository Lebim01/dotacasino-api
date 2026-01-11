import { Module } from '@nestjs/common';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { BetService } from '../bet/bet.service';
import { HttpModule } from '@nestjs/axios';
import { SoftGamingModule } from 'libs/domain/src/soft-gaming/soft-gaming.module';

@Module({
  imports: [
    HttpModule.register({
      baseURL: process.env.BET_API_URL,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    }),
    SoftGamingModule,
  ],
  controllers: [GamesController],
  providers: [GamesService, BetService],
  exports: [GamesService],
})
export class GamesModule {}
