import {
  Controller,
  Headers,
  Post,
  Body,
  Logger,
  Get,
  Query,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { QueryLedgerDto } from './dto/query-ledger.dto';
import { CasinoDashboardService } from './casino-dashboard.service';
import { TimeRangeDto } from './dto/report.dto';

type IsoDate = string;

@Controller('casino-dashboard')
export class CasinoDashboardController {
  private readonly logger = new Logger(CasinoDashboardController.name, {
    timestamp: true,
  });

  constructor(private readonly service: CasinoDashboardService) {}

  @Post('webhook')
  webhook(@Headers() headers: Record<string, string>, @Body() body: any) {
    this.logger.log(headers);
    this.logger.log(body);
    return 'OK';
  }

  @ApiOperation({ summary: 'Listar movimientos' })
  @Get()
  list(@Query() q: QueryLedgerDto) {
    return this.service.listEntries(q);
  }

  // ====== Endpoints de reportes admin ======

  @ApiOperation({ summary: 'Resumen por tipo y neto' })
  @Get('reports/summary')
  summary(@Query() q: TimeRangeDto) {
    return this.service.reportSummary(q);
  }

  @ApiOperation({ summary: 'Serie diaria por tipo y neto' })
  @Get('reports/daily')
  daily(@Query() q: TimeRangeDto) {
    return this.service.reportDaily(q);
  }

  // 1) Apuestas vs Premios (serie diaria)
  @Get('bets-vs-payouts')
  async betsVsPayouts(
    @Query('from') from?: IsoDate,
    @Query('to') to?: IsoDate,
  ) {
    return this.service.getDailyBetsVsPayouts({ from, to });
  }

  // 2) Top juegos (rondas y volumen)
  @Get('top-games')
  async topGames(
    @Query('from') from?: IsoDate,
    @Query('to') to?: IsoDate,
    @Query('limit') limit = '10',
  ) {
    return this.service.getTopGames({
      from,
      to,
      limit: Math.max(1, Number(limit) || 10),
    });
  }

  // 3) Tendencia: Depósitos vs Retiros vs GGR (serie diaria)
  @Get('trend-daily')
  async trendDaily(@Query('from') from?: IsoDate, @Query('to') to?: IsoDate) {
    return this.service.getDailyTrend({ from, to });
  }
}
