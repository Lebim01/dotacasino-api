import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { RanksService } from '../ranks/ranks.service';
import { BondsService } from '../bonds/bonds.service';
import { UsersService } from '../users/users.service';
import { MailerService } from '../mailer/mailer.service';
import { CoinpaymentsService } from '../coinpayments/coinpayments.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { DisruptiveService } from '../disruptive/disruptive.service';
import { CasinoService } from '../casino/casino.service';

@Module({
  providers: [
    ReportsService,
    RanksService,
    BondsService,
    UsersService,
    MailerService,
    CoinpaymentsService,
    AuthService,
    JwtService,
    DisruptiveService,
    CasinoService,
  ],
  controllers: [ReportsController],
})
export class ReportsModule {}
