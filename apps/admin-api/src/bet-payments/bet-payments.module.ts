import { Module } from '@nestjs/common';
import { BetPaymentsController } from './bet-payments.controller';
import { BetPaymentsService } from './bet-payments.service';
import { PrismaService } from 'libs/db/src/prisma.service';

@Module({
  controllers: [BetPaymentsController],
  providers: [BetPaymentsService, PrismaService],
})
export class BetPaymentsModule {}
