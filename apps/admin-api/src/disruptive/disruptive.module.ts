import { Module } from '@nestjs/common';
import { DisruptiveController } from './disruptive.controller';
import { DisruptiveService } from './disruptive.service';
import { WalletService } from '@domain/wallet/wallet.service';
import { PrismaService } from 'libs/db/src/prisma.service';

@Module({
  providers: [DisruptiveService, WalletService, PrismaService],
  controllers: [DisruptiveController],
  imports: [],
})
export class DisruptiveModule {}
