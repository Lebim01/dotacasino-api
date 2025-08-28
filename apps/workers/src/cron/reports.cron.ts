import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ReportsCron {
  @Cron('0 0 * * *')
  async daily() {
    console.log('Generating daily KPIs...');
    // TODO: snapshot balances, revenue, GGR/NGR, referrals, etc.
  }
}
