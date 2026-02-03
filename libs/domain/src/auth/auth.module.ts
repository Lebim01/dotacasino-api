import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthCommonService } from './auth.service';
import { JwtAuthModule } from '@security/jwt.module';
import { HttpModule } from '@nestjs/axios';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';
import { UserCommonService } from '@domain/users/users.service';
import { NodePaymentsService } from '@domain/node-payments/node-payments.service';
import { CasinoService } from '@domain/casino/casino.service';
import { UsersService } from 'apps/client-api/src/users/users.service';
import { ReferralService } from 'apps/client-api/src/referral/referral.service';
import { SoftGamingModule } from '@domain/soft-gaming/soft-gaming.module';
import { SoftGamingService } from '@domain/soft-gaming/soft-gaming.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthCommonService,
    UsersService,
    ReferralService,
    AuthAcademyService,
    UserCommonService,
    NodePaymentsService,
    CasinoService,
    SoftGamingService,
  ],
  exports: [],
  imports: [JwtAuthModule, HttpModule, SoftGamingModule],
})
export class AuthCommonModule {}
