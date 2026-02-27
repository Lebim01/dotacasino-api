import { Module } from '@nestjs/common';
import { RanksService } from './ranks.service';
import { RanksController } from './ranks.controller';
import { BondsService } from '../bonds/bonds.service';
import { UsersService } from '../users/users.service';
import { MailerService } from '../mailer/mailer.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';
import { DisruptiveService } from '@domain/disruptive/disruptive.service';
import { WalletService } from '@domain/wallet/wallet.service';
import { PrismaService } from 'libs/db/src/prisma.service';
import { ReportsCasinoService } from '../reports-casino/reports-casino.service';

@Module({
  providers: [
    RanksService,
    BondsService,
    UsersService,
    MailerService,
    AuthService,
    JwtService,
    DisruptiveService,
    WalletService,
    PrismaService,
    AuthAcademyService,
    ReportsCasinoService,
  ],
  controllers: [RanksController],
})
export class RanksModule {}
