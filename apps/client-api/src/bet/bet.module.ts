import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { BetService } from './bet.service';
import { BetController } from './bet.controller';

@Module({
  imports: [
    HttpModule.register({
      baseURL: process.env.BET_API_URL,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    }),
  ],
  providers: [BetService],
  controllers: [BetController],
})
export class BetModule {}
