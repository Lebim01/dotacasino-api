import { Global, Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { PrismaService } from 'libs/db/src/prisma.service';

@Global()
@Module({
  providers: [WalletService, PrismaService],
  exports: [WalletService],
})
export class WalletModule {}
