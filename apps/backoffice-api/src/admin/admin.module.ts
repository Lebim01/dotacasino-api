import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { BondsService } from '../bonds/bonds.service';
import { UsersService } from '../users/users.service';
import { MailerService } from '../mailer/mailer.service';
import { JwtService } from '@nestjs/jwt';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';
import { AuthService } from '../auth/auth.service';
import { DisruptiveService } from '@domain/disruptive/disruptive.service';
import { CasinoService } from '@domain/casino/casino.service';
import { WalletService } from '@domain/wallet/wallet.service';
import { PrismaService } from 'libs/db/src/prisma.service';
import { ReportsCasinoService } from '../reports-casino/reports-casino.service';

@Module({
  providers: [
    AdminService,
    BondsService,
    UsersService,
    MailerService,
    AuthAcademyService,
    JwtService,
    DisruptiveService,
    WalletService,
    PrismaService,
    AuthService,
    ReportsCasinoService,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
