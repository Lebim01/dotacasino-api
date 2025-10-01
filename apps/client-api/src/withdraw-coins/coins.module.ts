import { Module } from '@nestjs/common';

import { DisruptiveService } from '@domain/disruptive/disruptive.service';
import { CasinoService } from '@domain/casino/casino.service';
import { WithdrawCoinsController } from './coins.controller';

@Module({
  controllers: [WithdrawCoinsController],
  providers: [DisruptiveService, CasinoService],
})
export class WithdrawCoinsModule {}
