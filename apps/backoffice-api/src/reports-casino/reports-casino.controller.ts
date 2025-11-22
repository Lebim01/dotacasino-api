import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ReportsCasinoService } from './reports-casino.service';
import { GetCasinoWeeklyPnlDto } from './dto/get-casino-weekly-pnl.dto';
import { CurrentUser } from '@security/current-user.decorator';

@Controller('reports/casino')
export class ReportsController {
  constructor(private readonly reports: ReportsCasinoService) {}

  @Get('pnl')
  getWeeklyPnl(@Query() dto: GetCasinoWeeklyPnlDto) {
    return this.reports.getCasinoWeeklyPnl(dto);
  }

  // Admin / global
  @Get('paid')
  async getPaidReports() {
    return this.reports.getPaidReports();
  }

  // Historial del usuario autenticado
  @Get('me/paid')
  async getMyPaidReports(@CurrentUser() user) {
    return this.reports.getPaidReportsForUser(user.userId);
  }

  // Un corte específico para el usuario
  @Get('me/:reportId')
  async getMyReportById(@Param('reportId') reportId: string, @CurrentUser() user) {
    return this.reports.getReportByIdForUser(reportId, user.userId);
  }
}
