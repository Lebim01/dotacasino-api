import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { loadConfig } from '@config';
import { JwtAuthModule } from '@security/jwt.module';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { DbModule } from 'libs/db/src/db.module';
import { GamesModule } from './games/games.module';
import { ProfileModule } from './profile/profile.module';
import { AgModule } from './providers/ag/ag.module';
import { AgWebhookModule } from './providers/ag-webhook/ag-webhook.module';
import { WalletModule } from '@domain/wallet/wallet.module';
import { WalletClientModule } from './wallet/wallet.module';
import { KycModule } from './kyc/kyc.module';
import { TopupModule } from './wallet/topup.module';
import { BetModule } from './bet/bet.module';
import { ServersModule } from './servers/servers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [loadConfig] }),
    DbModule,
    JwtAuthModule,
    AuthModule,
    GamesModule,
    ProfileModule,
    AgModule,
    AgWebhookModule,
    WalletModule,
    WalletClientModule,
    KycModule,
    TopupModule,
    BetModule,
    ServersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
