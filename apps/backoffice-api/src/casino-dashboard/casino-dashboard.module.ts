import { Module } from '@nestjs/common';
import { CasinoDashboardController } from './casino-dashboard.controller';
import { CasinoDashboardService } from './casino-dashboard.service';
import { PrismaService } from 'libs/db/src/prisma.service';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  controllers: [CasinoDashboardController, MetricsController],
  providers: [CasinoDashboardService, PrismaService, MetricsService],
})
export class CasinoDashboardModule {}
