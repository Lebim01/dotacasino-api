import { Module } from '@nestjs/common';
import { ReportsController } from './reports-casino.controller';
import { ReportsService } from './reports-casino.service';
import { PrismaService } from 'libs/db/src/prisma.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, PrismaService],
})
export class ReportsCasinoModule {}
