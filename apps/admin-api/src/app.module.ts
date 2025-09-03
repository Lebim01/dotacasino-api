import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { loadConfig } from '@config';

import { HealthController } from './health.controller';
import { WalletAdminModule } from './wallet/wallet-admin.module';
import { JwtAuthModule } from '@security/jwt.module';
import { WalletModule } from '@domain/wallet/wallet.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '@security/jwt.guard';
import { RolesGuard } from '@security/roles.guard';
import { KycReviewModule } from './kyc-review/kyc-review.module';
import { DepositsModule } from './deposits/deposits.module';

@Module({
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
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
