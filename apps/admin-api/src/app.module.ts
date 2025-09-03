import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { loadConfig } from '@config';

import { HealthController } from './health.controller';
import { WalletAdminModule } from './wallet/wallet-admin.module';
import { JwtAuthModule } from '@security/jwt.module';
import { WalletModule } from '@domain/wallet/wallet.module';
import { KycReviewModule } from './kyc-review/kyc-review.module';
import { DepositsModule } from './deposits/deposits.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [loadConfig] }),
    JwtAuthModule,
    WalletModule,
    WalletAdminModule,
    KycReviewModule,
    DepositsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
