import { Module } from '@nestjs/common';

import { UserCommonService } from '@domain/users/users.service';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';
import { DisruptiveService } from '@domain/disruptive/disruptive.service';
import { CasinoService } from '@domain/casino/casino.service';
import { CoinsController } from './coins.controller';

@Module({
  controllers: [CoinsController],
  providers: [
    UserCommonService,
    AuthAcademyService,
    DisruptiveService,
    CasinoService,
  ],
})
export class CoinsModule {}
