import { Module } from '@nestjs/common';
import { DisruptiveController } from './disruptive.controller';
import { DisruptiveService } from './disruptive.service';
import { WalletService } from '@domain/wallet/wallet.service';
import { PrismaService } from 'libs/db/src/prisma.service';
import { CasinoService } from '@domain/casino/casino.service';
import { NodePaymentsService } from '@domain/node-payments/node-payments.service';

@Module({
  providers: [DisruptiveService, WalletService, PrismaService, CasinoService, NodePaymentsService],
  controllers: [DisruptiveController],
  imports: [],
})
export class DisruptiveModule {}
