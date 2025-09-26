import { Module } from '@nestjs/common';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';
import { UserCommonService } from '@domain/users/users.service';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';
import { DisruptiveService } from '@domain/disruptive/disruptive.service';
import { CasinoService } from '@domain/casino/casino.service';

@Module({
  controllers: [MembershipsController],
  providers: [
    MembershipsService,
    UserCommonService,
    AuthAcademyService,
    DisruptiveService,
    CasinoService,
  ],
})
export class MembershipsModule {}
