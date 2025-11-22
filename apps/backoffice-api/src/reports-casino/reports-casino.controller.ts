import { Controller, Get, Post, Query } from '@nestjs/common';
import { ReportsCasinoService } from './reports-casino.service';
import { GetCasinoWeeklyPnlDto } from './dto/get-casino-weekly-pnl.dto';

@Controller('reports/casino')
export class ReportsController {
  constructor(private readonly reports: ReportsCasinoService) {}

  @Get('pnl')
  getWeeklyPnl(@Query() dto: GetCasinoWeeklyPnlDto) {
    return this.reports.getCasinoWeeklyPnl(dto);
  }
}
