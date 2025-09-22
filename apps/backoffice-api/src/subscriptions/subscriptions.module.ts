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
import { DisruptiveService } from '../disruptive/disruptive.service';
import { CasinoService } from '../casino/casino.service';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';

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
    CasinoService,
    AuthAcademyService,
  ],
  controllers: [SubscriptionsController],
  imports: [],
})
export class SubscriptionsModule {}
