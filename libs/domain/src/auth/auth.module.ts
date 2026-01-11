import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthCommonService } from './auth.service';
import { JwtAuthModule } from '@security/jwt.module';
import { HttpModule } from '@nestjs/axios';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';
import { UserCommonService } from '@domain/users/users.service';
import { DisruptiveService } from '@domain/disruptive/disruptive.service';
import { CasinoService } from '@domain/casino/casino.service';
import { UsersService } from 'apps/client-api/src/users/users.service';
import { ReferralService } from 'apps/client-api/src/referral/referral.service';
import { SoftGamingModule } from '@domain/soft-gaming/soft-gaming.module';

@Module({
  controllers: [AuthController],
  providers: [
    AuthCommonService,
    UsersService,
    ReferralService,
    AuthAcademyService,
    UserCommonService,
    DisruptiveService,
    CasinoService,
  ],
  exports: [],
  imports: [JwtAuthModule, HttpModule, SoftGamingModule],
})
export class AuthCommonModule {}
