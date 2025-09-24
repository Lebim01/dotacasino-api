import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthModule } from '@security/jwt.module';
import { UsersService } from '../users/users.service';
import { ReferralService } from '../referral/referral.service';
import { HttpModule } from '@nestjs/axios';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';
import { UserCommonService } from '@domain/users/users.service';
import { DisruptiveService } from '@domain/disruptive/disruptive.service';
import { CasinoService } from '@domain/casino/casino.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    UsersService,
    ReferralService,
    AuthAcademyService,
    UserCommonService,
    DisruptiveService,
    CasinoService,
  ],
  exports: [],
  imports: [JwtAuthModule, HttpModule],
})
export class AuthModule {}
