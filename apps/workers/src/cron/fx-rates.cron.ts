import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FxService } from '@domain/fx/fx.service';

@Injectable()
export class FxRatesCron {
  private readonly logger = new Logger(FxRatesCron.name);

  constructor(private readonly fx: FxService) {}

  // Daily at 00:05 server time.
  @Cron('5 0 * * *')
  async refreshDailyRates() {
    const rates = await this.fx.refreshUsdRatesDaily();
    this.logger.log(
      `FX refreshed: USD->MXN ${rates.MXN}, USD->COP ${rates.COP}, USD->ARS ${rates.ARS}`,
    );
  }
}
