import { Module } from '@nestjs/common';
import { WalletAdminController } from './wallet-admin.controller';
import { WalletAdminService } from './wallet-admin.service';
import { PrismaService } from 'libs/db/src/prisma.service';

@Module({
  controllers: [WalletAdminController],
  providers: [WalletAdminService, PrismaService],
})
export class WalletAdminModule {}
