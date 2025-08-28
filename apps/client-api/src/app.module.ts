import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { loadConfig } from '@config';
import { JwtAuthModule } from '@security/jwt.module';

import { HealthController } from './health.controller';
import { WalletController } from './wallet.controller';
import { AuthModule } from './auth/auth.module';
import { DbModule } from 'libs/db/src/db.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [loadConfig] }),
    DbModule,
    JwtAuthModule,
    AuthModule,
  ],
  controllers: [HealthController, WalletController],
})
export class AppModule {}
