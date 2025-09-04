import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { BetService } from './bet.service';
import { BetController } from './bet.controller';
import { PrismaService } from 'libs/db/src/prisma.service';

@Module({
  imports: [
    HttpModule.register({
      baseURL: process.env.BET_API_URL,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    }),
    PrismaService,
  ],
  providers: [BetService],
  controllers: [BetController],
})
export class BetModule {}
