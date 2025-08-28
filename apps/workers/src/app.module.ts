import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { loadConfig } from '@config';
import { QueueModule } from '@queue/queue.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SettlementProcessor } from './processors/settlement.processor';
import { ReportsCron } from './cron/reports.cron';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [loadConfig] }),
    ScheduleModule.forRoot(),
  ],
  providers: [],
})
export class AppModule {}
