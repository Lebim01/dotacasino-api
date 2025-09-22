import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { BondsService } from '../bonds/bonds.service';
import { UsersService } from '../users/users.service';
import { MailerService } from '../mailer/mailer.service';
import { CoinpaymentsService } from '../coinpayments/coinpayments.service';
import { JwtService } from '@nestjs/jwt';
import { DisruptiveService } from '../disruptive/disruptive.service';
import { CasinoService } from '../casino/casino.service';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';
import { AuthService } from '../auth/auth.service';

@Module({
  providers: [
    AdminService,
    BondsService,
    UsersService,
    MailerService,
    CoinpaymentsService,
    AuthAcademyService,
    JwtService,
    DisruptiveService,
    CasinoService,
    AuthService,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
