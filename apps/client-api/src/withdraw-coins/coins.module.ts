import { Module } from '@nestjs/common';

import { NodePaymentsService } from '@domain/node-payments/node-payments.service';
import { CasinoService } from '@domain/casino/casino.service';
import { WithdrawCoinsController } from './coins.controller';

@Module({
  controllers: [WithdrawCoinsController],
  providers: [NodePaymentsService, CasinoService],
})
export class WithdrawCoinsModule {}
