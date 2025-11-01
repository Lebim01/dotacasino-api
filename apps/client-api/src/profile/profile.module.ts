import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { WalletService } from '@domain/wallet/wallet.service';

@Module({
  controllers: [ProfileController],
  providers: [ProfileService, WalletService],
})
export class ProfileModule {}
