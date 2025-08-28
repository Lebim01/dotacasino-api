import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { loadConfig } from '@config';

import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [loadConfig] }),
    // TODO: RBACModule, ReportsModule, RiskModule, KycModule...
  ],
  controllers: [HealthController],
})
export class AppModule {}
