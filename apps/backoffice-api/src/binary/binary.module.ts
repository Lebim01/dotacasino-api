import { Module } from '@nestjs/common';
import { BinaryService } from './binary.service';
import { BinaryController } from './binary.controller';
import { BondsService } from '../bonds/bonds.service';
import { UsersService } from '../users/users.service';
import { MailerService } from '../mailer/mailer.service';
import { CoinpaymentsService } from '../coinpayments/coinpayments.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { DisruptiveService } from '../disruptive/disruptive.service';
import { CasinoService } from '../casino/casino.service';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';

@Module({
  providers: [
    BinaryService,
    BondsService,
    UsersService,
    MailerService,
    CoinpaymentsService,
    AuthService,
    JwtService,
    DisruptiveService,
    CasinoService,
    AuthAcademyService,
  ],
  controllers: [BinaryController],
})
export class BinaryModule {}
