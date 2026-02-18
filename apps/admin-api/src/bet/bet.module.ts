import { Module } from '@nestjs/common';
import { BetController } from './bet.controller';
import { WalletService } from '@domain/wallet/wallet.service';
import { PrismaService } from 'libs/db/src/prisma.service';
import { UserCommonService } from '@domain/users/users.service';
import { DisruptiveService } from '@domain/disruptive/disruptive.service';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';
import { CasinoService } from '@domain/casino/casino.service';
import { NodePaymentsService } from '@domain/node-payments/node-payments.service';

@Module({
  controllers: [BetController],
  providers: [
    WalletService,
    PrismaService,
    CasinoService,
    UserCommonService,
    DisruptiveService,
    AuthAcademyService,
    NodePaymentsService,
  ],
})
export class BetModule { }
