import {
  Controller,
  Headers,
  Post,
  Body,
  Logger,
  Get,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { QueryLedgerDto } from './dto/query-ledger.dto';
import { BetPaymentsService } from './bet-payments.service';
import { TimeRangeDto } from './dto/report.dto';

@Controller('bet-payments')
export class BetPaymentsController {
  private readonly logger = new Logger(BetPaymentsController.name, {
    timestamp: true,
  });

  constructor(private readonly service: BetPaymentsService) {}

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
}
