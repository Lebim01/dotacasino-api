import { Module } from '@nestjs/common';
import { CasinoService } from './casino.service';
import { CasinoController } from './casino.controller';

@Module({
  providers: [CasinoService],
  controllers: [CasinoController]
})
export class CasinoModule {}
