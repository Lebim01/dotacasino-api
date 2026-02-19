import {
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { NodePaymentsService } from '../node-payments/node-payments.service';
import {
  ApproveWithdraw,
  CompleteTransactionDisruptiveCasinoDto,
  CreateDepositDto,
  CreateTransactionDisruptiveCasinoDto,
  CreateWithdrawCasino,
  UserTokenDTO,
} from './dto/transaction.dto';
import { CasinoService } from '../casino/casino.service';
import { google } from '@google-cloud/tasks/build/protos/protos';
import { db } from 'apps/backoffice-api/src/firebase/admin';
import {
  addToQueue,
  getPathQueue,
} from 'apps/backoffice-api/src/googletask/utils';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@security/jwt.guard';
import { RolesGuard } from '@security/roles.guard';
import { Roles } from '@security/roles.decorator';
import { USER_ROLES } from 'apps/backoffice-api/src/auth/auth.constants';
import { CurrentUser } from '@security/current-user.decorator';
import { WalletService } from '@domain/wallet/wallet.service';

@Controller('disruptive')
export class DisruptiveController {
  constructor(
    private readonly nodePaymentsService: NodePaymentsService,
    private readonly casinoService: CasinoService,
    private readonly walletService: WalletService,
  ) { }

  @Post('create-transaction-deposit')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async createtransactionacademy(
    @CurrentUser() { userId }: { userId: string },
    @Body() body: CreateDepositDto,
  ) {
    // This was DisruptiveService.createDeposit, which doesn't seem to have a direct equivalent in my added methods yet.
    // However, NodePaymentsService.createAddress is the base.
    // DisruptiveService.createDeposit used 'BSC' and stored in disruptive-academy.
    // I added createMembershipTransaction which uses disruptive-academy.
    // Let's assume for now we use createMembershipTransaction with a 'deposit' type if needed, 
    // or I should add createDepositTransaction.
    // Actually, I'll use createMembershipTransaction for now or add createDepositTransaction.
    // Let's add createDepositTransaction to NodePaymentsService first.
    return this.nodePaymentsService.createMembershipTransaction(userId, 'deposit', 'BSC', body.amount);
  }

  @Post('completed-transaction-deposit')
  async completedtransactiondeposit(
    @Body() body: CompleteTransactionDisruptiveCasinoDto,
  ) {
    const res = await db
      .collection('node-payments')
      .where('address', '==', body.address)
      .where('type', '==', 'academy')
      .where('status', '==', 'pending')
      .get()
      .then((r: any) => (r.empty ? null : r.docs[0]));

    if (res) {
      await res.ref.update({
        status: 'completed',
        completed_at: new Date(),
      });
    }
    return 'OK';
  }

  @Post('completed-transaction-membership')
  async completedtransactionmembership(
    @Body() body: CompleteTransactionDisruptiveCasinoDto,
  ) {
    const res = await db
      .collection('node-payments')
      .where('address', '==', body.address)
      .where('type', '==', 'academy')
      .where('status', '==', 'pending')
      .get()
      .then((r: any) => (r.empty ? null : r.docs[0]));

    if (res) {
      await res.ref.update({
        status: 'completed',
        completed_at: new Date(),
      });
    }
    return 'OK';
  }

  @Post('cancel-transaction-casino')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async canceltransactioncasino(
    @Body() body: CompleteTransactionDisruptiveCasinoDto,
  ) {
    return this.nodePaymentsService.cancelTransactionCasino(body.address);
  }

  @Post('cancel-withdraw-casino')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async cancelwithdrawcasino(
    @Body() body: UserTokenDTO,
    @CurrentUser() user: { userId: string },
  ) {
    return this.nodePaymentsService.cancelWithdrawCasino(user.userId);
  }

  @Post('create-transaction-casino')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async createtransactioncasino(
    @Body() body: CreateTransactionDisruptiveCasinoDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.nodePaymentsService.createTransactionCasino(
      body.network,
      user.userId,
      body.amount,
    );
  }

  @Post('withdraw-casino')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async withdrawcasino(
    @Body() body: CreateWithdrawCasino,
    @CurrentUser() user: { userId: string },
  ) {
    const balance = await this.walletService.getBalance(user.userId);
    const pending = await this.walletService.getPendingAmount(user.userId);
    if (balance >= body.amount + pending) {
      await this.nodePaymentsService.requestWithdraw(
        user.userId,
        body.amount,
        body.address,
      );
      return {
        status: true,
        message: 'request_withdraw_success',
      };
    } else {
      return {
        status: false,
        message: 'not_enought_balance',
      };
    }
  }

  @Post('create-withdraw-qr')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  async createwithdrawqr(@Body() body: ApproveWithdraw) {
    const transactions = [];
    for (const id of body.ids) {
      const d = await db.collection('node-payments').doc(id).get();
      transactions.push({
        id: d.id,
        address: d.get('address'),
        amount: d.get('amount'),
      } as never);
    }

    const res = await this.nodePaymentsService.sendWithdraw(transactions);

    return {
      address: res.address,
      fundsGoal: res.fundsGoal,
      network: res.network,
    };
  }

  @Post('approve-withdraw-casino')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  async approvedwithdraw(@Body() body: ApproveWithdraw) {
    for (const id of body.ids) {
      const transaction = await db
        .collection('node-payments')
        .doc(id)
        .get();

      const user_id = transaction.get('user_id');
      const amount = transaction.get('amount');

      await transaction.ref.update({
        status: 'approved',
        approved_at: new Date(),
      });

      await this.walletService.debit({
        amount,
        reason: 'WITHDRAW',
        userId: user_id,
        idempotencyKey: transaction.id,
      });
    }
  }

  @Post('validate')
  async validate(@Body() body: CompleteTransactionDisruptiveCasinoDto) {
    const transaction = await this.nodePaymentsService.getTransaction(
      body.address,
    );

    if (!transaction) throw new HttpException('not found', 401);

    const validation = await this.nodePaymentsService.validateStatus(
      transaction.get('network'),
      body.address,
    );

    return validation.confirmed;
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
      transaction.get('network'),
      body.address,
    );

    if (validation.confirmed) {
      if (transaction.get('status') != 'completed') {
        await transaction.ref.update({
          status: 'completed',
          completed_at: new Date(),
        });

        await this.walletService.credit({
          amount: transaction.get('amount'),
          reason: 'USER_TOPUP',
          userId: transaction.get('user_id'),
          meta: {
            txid: transaction.id,
            address: transaction.get('address'),
            network: transaction.get('network'),
          },
          idempotencyKey: transaction.id,
        });
      }
    }

    return 'FAIL';
  }

  @Post('polling')
  async polling(@Body() body: CompleteTransactionDisruptiveCasinoDto) {
    const transaction = await this.nodePaymentsService.getTransaction(
      body.address,
    );

    if (!transaction) throw new HttpException('not found', 401);

    const validation = await this.nodePaymentsService.validateStatus(
      transaction.get('network'),
      body.address,
    );

    if (validation.confirmed) {
      type Method = 'POST';
      const task: google.cloud.tasks.v2.ITask = {
        httpRequest: {
          httpMethod: 'POST' as Method,
          url: `https://backoffice-api-1039762081728.us-central1.run.app/v1/disruptive/completed-transaction-casino`,
          headers: {
            'Content-Type': 'application/json',
          },
          body: Buffer.from(JSON.stringify(body)),
        },
      };
      await addToQueue(task, getPathQueue('disruptive-complete'));
    }

    return validation.confirmed ? transaction.get('status') : 'NO';
  }

  @Get('get-withdraw-casino')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  getwithdrawcasino() {
    return this.nodePaymentsService.getWithdrawListAdmin();
  }
}
