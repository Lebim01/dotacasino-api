import { Global, Module } from '@nestjs/common';
import { UserCommonService } from './users.service';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';
import { PrismaService } from 'libs/db/src/prisma.service';
import { NodePaymentsService } from '@domain/node-payments/node-payments.service';
import { WalletService } from '@domain/wallet/wallet.service';

@Global()
@Module({
  imports: [PrismaService],
  providers: [
    UserCommonService,
    AuthAcademyService,
    NodePaymentsService,
    WalletService,
  ],
  exports: [UserCommonService],
})
export class UserCommonModule {}
