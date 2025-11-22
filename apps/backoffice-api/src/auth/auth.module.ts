import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MailerModule } from '../mailer/mailer.module';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { BinaryService } from '../binary/binary.service';
import { BondsService } from '../bonds/bonds.service';
import { UsersService } from '../users/users.service';
import { CoinpaymentsService } from '../coinpayments/coinpayments.service';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';
import { DisruptiveService } from '@domain/disruptive/disruptive.service';
import { CasinoService } from '@domain/casino/casino.service';
import { JwtStrategy } from '@security/jwt.strategy';
import { AuthCommonService } from '@domain/auth/auth.service';
import { PrismaService } from 'libs/db/src/prisma.service';
import { UserCommonService } from '@domain/users/users.service';
import { WalletService } from '@domain/wallet/wallet.service';
import { ReferralService } from 'apps/client-api/src/referral/referral.service';
import { JwtAuthModule } from '@security/jwt.module';
import { ReportsCasinoService } from '../reports-casino/reports-casino.service';

@Module({
  imports: [JwtAuthModule, MailerModule],
  providers: [
    PrismaService,
    AuthService,
    JwtStrategy,
    UsersService,
    CasinoService,
    DisruptiveService,
    AuthAcademyService,
    AuthCommonService,
    UserCommonService,
    WalletService,
    ReferralService,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
