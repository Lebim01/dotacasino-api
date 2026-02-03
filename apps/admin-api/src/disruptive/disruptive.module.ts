import { Module } from '@nestjs/common';
import { DisruptiveController } from './disruptive.controller';
import { NodePaymentsService } from '@domain/node-payments/node-payments.service';
import { WalletService } from '@domain/wallet/wallet.service';
import { PrismaService } from 'libs/db/src/prisma.service';

@Module({
  providers: [NodePaymentsService, WalletService, PrismaService],
  controllers: [DisruptiveController],
  imports: [],
})
export class DisruptiveModule {}
