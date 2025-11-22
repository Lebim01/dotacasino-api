import { Module } from '@nestjs/common';
import { ReportsController } from './reports-casino.controller';
import { ReportsCasinoService } from './reports-casino.service';
import { PrismaService } from 'libs/db/src/prisma.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsCasinoService, PrismaService],
})
export class ReportsCasinoModule {}
