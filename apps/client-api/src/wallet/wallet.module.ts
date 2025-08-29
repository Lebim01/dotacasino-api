import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { ClientWalletService } from './wallet.service';
import { PrismaService } from 'libs/db/src/prisma.service';

@Module({
  controllers: [WalletController],
  providers: [ClientWalletService, PrismaService],
})
export class WalletClientModule {}
