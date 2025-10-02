import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { loadConfig } from '@config';

import { HealthController } from './health.controller';
import { WalletAdminModule } from './wallet/wallet-admin.module';
import { JwtAuthModule } from '@security/jwt.module';
import { WalletModule } from '@domain/wallet/wallet.module';
import { KycReviewModule } from './kyc-review/kyc-review.module';
import { DepositsModule } from './deposits/deposits.module';
import { GitslotparkModule } from './gitslotpark/gitslotpark.module';
import { Tbs2apiModule } from './tbs2api/tbs2api.module';
import { DisruptiveModule } from './disruptive/disruptive.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [loadConfig] }),
    JwtAuthModule,
    WalletModule,
    WalletAdminModule,
    KycReviewModule,
    DepositsModule,
    GitslotparkModule,
    Tbs2apiModule,
    DisruptiveModule
  ],
  controllers: [HealthController],
})
export class AppModule {}
