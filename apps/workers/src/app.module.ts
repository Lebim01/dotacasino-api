import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { loadConfig } from '@config';
import { ScheduleModule } from '@nestjs/schedule';
import { FxModule } from '@domain/fx/fx.module';
import { FxRatesCron } from './cron/fx-rates.cron';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [loadConfig] }),
    ScheduleModule.forRoot(),
    FxModule,
  ],
  providers: [FxRatesCron],
})
export class AppModule {}
