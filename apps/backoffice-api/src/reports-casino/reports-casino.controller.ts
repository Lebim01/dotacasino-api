import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports-casino.service';
import { GetCasinoWeeklyPnlDto } from './dto/get-casino-weekly-pnl.dto';

@Controller('reports/casino')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /**
   * GET /reports/casino/pnl
   * Parámetros opcionales:
   *  - from, to: YYYY-MM-DD en TZ CDMX
   *  - timezone: IANA (default America/Mexico_City)
   *  - includeCurrentWeek: boolean
   */
  @Get('pnl')
  getWeeklyPnl(@Query() dto: GetCasinoWeeklyPnlDto) {
    return this.reports.getCasinoWeeklyPnl(dto);
  }
}
