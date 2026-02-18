import { Module } from '@nestjs/common';

import { CasinoService } from '@domain/casino/casino.service';
import { DepositCoinsController } from './coins.controller';
import { NodePaymentsService } from '@domain/node-payments/node-payments.service';

@Module({
  controllers: [DepositCoinsController],
  providers: [CasinoService, NodePaymentsService],
})
export class DepositCoinsModule {}
