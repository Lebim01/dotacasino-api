import {
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { NodePaymentsService } from '@domain/node-payments/node-payments.service';
import {
  ApproveWithdraw,
  CompleteTransactionDisruptiveCasinoDto,
} from './dto/transaction.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@security/jwt.guard';
import { RolesGuard } from '@security/roles.guard';
import { Roles } from '@security/roles.decorator';
import { USER_ROLES } from 'apps/backoffice-api/src/auth/auth.constants';
import { WalletService } from '@domain/wallet/wallet.service';
import { PrismaService } from 'libs/db/src/prisma.service';

@Controller('disruptive')
export class DisruptiveController {
  constructor(
    private readonly nodePaymentsService: NodePaymentsService,
    private readonly walletService: WalletService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('approve-withdraw-casino')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  async approvedwithdraw(@Body() body: ApproveWithdraw) {
    for (const id of body.ids) {
      const transaction = await this.prisma.nodePayment.findUnique({ where: { id } });
      if (!transaction) continue;

      await this.prisma.nodePayment.update({
        where: { id },
        data: { status: 'approved', completedAt: new Date() },
      });

      await this.walletService.debit({
        amount: Number(transaction.amount),
        reason: 'withdraw',
        userId: transaction.userId ?? '',
        idempotencyKey: transaction.id,
      });
    }
  }

  @Post('completed-transaction-casino')
  async completedtransactioncasino(
    @Body() body: CompleteTransactionDisruptiveCasinoDto,
  ) {
    const transaction = await this.nodePaymentsService.getTransaction(
      body.address,
    );

    if (!transaction) throw new HttpException('not found', 401);

    const validation = await this.nodePaymentsService.validateStatus(
      transaction.network as any,
      body.address,
    );

    if (validation.confirmed) {
      if (transaction.status !== 'completed') {
        await this.prisma.nodePayment.update({
          where: { id: transaction.id },
          data: { status: 'completed', completedAt: new Date() },
        });

        await this.walletService.credit({
          amount: Number(transaction.amount),
          reason: 'recharge',
          userId: transaction.userId ?? '',
          idempotencyKey: transaction.id,
        });
      }
    }

    return 'FAIL';
  }

  @Get('get-withdraw-casino')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  async getwithdrawcasino() {
    return this.nodePaymentsService.getWithdrawListAdmin();
  }
}
