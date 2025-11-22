import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { BondsService } from '../bonds/bonds.service';
import { UsersService } from '../users/users.service';
import { BinaryService } from '../binary/binary.service';
import { EmailService } from '../email/email.service';
import { MailerService } from '../mailer/mailer.service';
import { CoinpaymentsService } from '../coinpayments/coinpayments.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';
import { DisruptiveService } from '@domain/disruptive/disruptive.service';
import { CasinoService } from '@domain/casino/casino.service';
import { WalletService } from '@domain/wallet/wallet.service';
import { PrismaService } from 'libs/db/src/prisma.service';
import { ReportsCasinoService } from '../reports-casino/reports-casino.service';

@Module({
  providers: [
    SubscriptionsService,
    BondsService,
    UsersService,
    BinaryService,
    EmailService,
    MailerService,
    CoinpaymentsService,
    AuthService,
    JwtService,
    DisruptiveService,
    WalletService,
    PrismaService,
    AuthAcademyService,
    ReportsCasinoService,
  ],
  controllers: [SubscriptionsController],
  imports: [],
})
export class SubscriptionsModule {}
