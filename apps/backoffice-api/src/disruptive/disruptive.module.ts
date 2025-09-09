import { Module } from '@nestjs/common';
import { DisruptiveController } from './disruptive.controller';
import { DisruptiveService } from './disruptive.service';
import { CasinoService } from '../casino/casino.service';

@Module({
  providers: [DisruptiveService, CasinoService],
  controllers: [DisruptiveController],
  imports: [],
})
export class DisruptiveModule {}
