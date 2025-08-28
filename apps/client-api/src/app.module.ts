import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { loadConfig } from '@config';
import { JwtAuthModule } from '@security/jwt.module';

import { HealthController } from './health.controller';
import { WalletController } from './wallet.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [loadConfig] }),
    JwtAuthModule,
    // TODO: AuthModule, GamesModule, BetsModule, ReferralsModule...
  ],
  controllers: [HealthController, WalletController],
})
export class AppModule {}
