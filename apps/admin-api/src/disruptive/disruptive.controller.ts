import {
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { DisruptiveService } from './disruptive.service';
import {
  ApproveWithdraw,
  CompleteTransactionDisruptiveCasinoDto,
} from './dto/transaction.dto';
import { db } from 'apps/backoffice-api/src/firebase/admin';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@security/jwt.guard';
import { RolesGuard } from '@security/roles.guard';
import { Roles } from '@security/roles.decorator';
import { USER_ROLES } from 'apps/backoffice-api/src/auth/auth.constants';
import { WalletService } from '@domain/wallet/wallet.service';

@Controller('disruptive')
export class DisruptiveController {
  constructor(
    private readonly disruptiveService: DisruptiveService,
    private readonly walletService: WalletService,
  ) {}

  @Post('approve-withdraw-casino')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  async approvedwithdraw(@Body() body: ApproveWithdraw) {
    for (const id of body.ids) {
      const transaction = await db
        .collection('casino-transactions')
        .doc(id)
        .get();

      const userid = transaction.get('userid');
      const amount = transaction.get('amount');

      await transaction.ref.update({
        status: 'approved',
        approved_at: new Date(),
      });

      // restar creditos
      await this.walletService.debit({
        amount,
        reason: 'withdraw',
        userId: userid,
        idempotencyKey: transaction.id,
      });
    }
  }

  @Post('completed-transaction-casino')
  async completedtransactioncasino(
    @Body() body: CompleteTransactionDisruptiveCasinoDto,
  ) {
    const transaction = await this.disruptiveService.getTransaction(
      body.address,
    );

    if (!transaction) throw new HttpException('not found', 401);

    const status = await this.disruptiveService.validateStatus(
      transaction.get('network'),
      body.address,
    );

    if (status) {
      if (transaction.get('status') != 'completed') {
        await transaction.ref.update({
          status: 'completed',
          completed_at: new Date(),
        });

        // sumar creditos
        await this.walletService.credit({
          amount: transaction.get('amount'),
          reason: 'recharge',
          userId: transaction.get('userid'),
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
    return this.disruptiveService.getWithdrawListAdmin();
  }
}
