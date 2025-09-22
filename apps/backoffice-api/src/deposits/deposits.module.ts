import { Module } from '@nestjs/common';
import { DepositsService } from './deposits.service';
import { DepositsController } from './deposits.controller';
import { BinaryService } from '../binary/binary.service';
import { BondsService } from '../bonds/bonds.service';
import { UsersService } from '../users/users.service';
import { CoinpaymentsService } from '../coinpayments/coinpayments.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '../mailer/mailer.service';
import { DisruptiveService } from '../disruptive/disruptive.service';
import { CasinoService } from '../casino/casino.service';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';

@Module({
  providers: [
    DepositsService,
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
  controllers: [DepositsController],
})
export class DepositsModule {}
