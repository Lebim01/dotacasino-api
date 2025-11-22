import { Module } from '@nestjs/common';
import { BondsService } from './bonds.service';
import { UsersService } from '../users/users.service';
import { BondsController } from './bonds.controller';
import { WalletService } from '@domain/wallet/wallet.service';
import { PrismaService } from 'libs/db/src/prisma.service';
import { ReportsCasinoService } from '../reports-casino/reports-casino.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailerService } from '../mailer/mailer.service';
import { JwtAuthModule } from '@security/jwt.module';
import { AuthService } from '../auth/auth.service';

@Module({
  imports: [JwtAuthModule, MailerModule],
  providers: [
    BondsService,
    UsersService,
    WalletService,
    PrismaService,
    ReportsCasinoService,
    MailerService,
    AuthService,
  ],
  controllers: [BondsController],
})
export class BondsModule {}
