import { Controller, Get, Query } from '@nestjs/common';
import { MetricsService } from './metrics.service';

type IsoDate = string; // '2025-10-03T00:00:00.000Z'

@Controller('metrics')
export class MetricsController {
  constructor(private readonly service: MetricsService) {}

  @Get('deposits')
  async deposits(
    @Query('from') from?: IsoDate,
    @Query('to') to?: IsoDate,
  ) {
    return this.service.getTotalDeposits({ from, to });
  }

  @Get('withdrawals')
  async withdrawals(
    @Query('from') from?: IsoDate,
    @Query('to') to?: IsoDate,
  ) {
    return this.service.getTotalWithdrawals({ from, to });
  }

  @Get('active-players')
  async activePlayers(
    @Query('hours') hours: string = '24',
  ) {
    const h = Math.max(1, Number(hours) || 24);
    return this.service.getActivePlayers({ hours: h });
  }

  @Get('gross-profit')
  async grossProfit(
    @Query('from') from?: IsoDate,
    @Query('to') to?: IsoDate,
  ) {
    return this.service.getGrossProfit({ from, to });
  }

  @Get('net-profit')
  async netProfit(
    @Query('from') from?: IsoDate,
    @Query('to') to?: IsoDate,
  ) {
    return this.service.getNetProfit({ from, to });
  }

  /** Conveniencia: todo en un solo request */
  @Get('overview')
  async overview(
    @Query('from') from?: IsoDate,
    @Query('to') to?: IsoDate,
    @Query('hours') hours: string = '24',
  ) {
    const [deposits, withdrawals, grossProfit, netProfit, activePlayers] =
      await Promise.all([
        this.service.getTotalDeposits({ from, to }),
        this.service.getTotalWithdrawals({ from, to }),
        this.service.getGrossProfit({ from, to }),
        this.service.getNetProfit({ from, to }),
        this.service.getActivePlayers({ hours: Number(hours) || 24 }),
      ]);

    return { from, to, hours: Number(hours) || 24, deposits, withdrawals, grossProfit, netProfit, activePlayers };
  }

  @Get('wallet-summary')
  async summary() {
    return this.service.getSummary();
  }

  @Get('wallet-top-holders')
  async topHolders(@Query('limit') limit = '20') {
    const n = Math.max(1, Math.min(100, Number(limit) || 20));
    return this.service.getTopHolders({ limit: n });
  }
}
