import { Module } from '@nestjs/common';

import { DisruptiveService } from '@domain/disruptive/disruptive.service';
import { CasinoService } from '@domain/casino/casino.service';
import { CoinsController } from './coins.controller';

@Module({
  controllers: [CoinsController],
  providers: [DisruptiveService, CasinoService],
})
export class WithdrawCoinsModule {}
