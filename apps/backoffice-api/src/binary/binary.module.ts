import { Module } from '@nestjs/common';
import { BinaryService } from './binary.service';
import { BinaryController } from './binary.controller';
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
    BinaryService,
    BondsService,
    UsersService,
    MailerService,
    AuthService,
    JwtService,
    DisruptiveService,
    WalletService,
    AuthAcademyService,
    PrismaService,
    ReportsCasinoService,
  ],
  controllers: [BinaryController],
})
export class BinaryModule {}
