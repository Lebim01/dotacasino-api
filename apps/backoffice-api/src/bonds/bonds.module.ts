import { Module } from '@nestjs/common';
import { BondsService } from './bonds.service';
import { UsersService } from '../users/users.service';
import { BondsController } from './bonds.controller';
import { WalletService } from '@domain/wallet/wallet.service';

@Module({
  providers: [BondsService, UsersService, WalletService],
  controllers: [BondsController],
})
export class BondsModule {}
