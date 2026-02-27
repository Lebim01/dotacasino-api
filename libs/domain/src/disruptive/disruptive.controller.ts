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
import { PrismaService } from 'libs/db/src/prisma.service';

@Controller('disruptive')
export class DisruptiveController {
  constructor(
    private readonly nodePaymentsService: NodePaymentsService,
    private readonly casinoService: CasinoService,
    private readonly walletService: WalletService,
    private readonly prisma: PrismaService,
  ) { }

  @Post('create-transaction-deposit')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async createtransactionacademy(
    @CurrentUser() { userId }: { userId: string },
    @Body() body: CreateDepositDto,
  ) {
    return this.nodePaymentsService.createMembershipTransaction(userId, 'deposit', 'BSC', body.amount);
  }

  @Post('completed-transaction-deposit')
  async completedtransactiondeposit(
    @Body() body: CompleteTransactionDisruptiveCasinoDto,
  ) {
    const res = await this.prisma.nodePayment.findFirst({
      where: {
        address: body.address,
        type: 'academy',
        status: 'pending',
      },
    });

    if (res) {
      await this.prisma.nodePayment.update({
        where: { id: res.id },
        data: { status: 'completed', completedAt: new Date() },
      });
    }
    return 'OK';
  }

  @Post('completed-transaction-membership')
  async completedtransactionmembership(
    @Body() body: CompleteTransactionDisruptiveCasinoDto,
  ) {
    const res = await this.prisma.nodePayment.findFirst({
      where: {
        address: body.address,
        type: 'academy',
        status: 'pending',
      },
    });

    if (res) {
      await this.prisma.nodePayment.update({
        where: { id: res.id },
        data: { status: 'completed', completedAt: new Date() },
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
    if (Number(balance) >= body.amount + Number(pending)) {
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
    const transactions: { id: string; address: string; amount: number }[] = [];
    for (const id of body.ids) {
      const doc = await this.prisma.nodePayment.findUnique({ where: { id } });
      if (doc) {
        transactions.push({
          id: doc.id,
          address: doc.address ?? '',
          amount: Number(doc.amount),
        });
      }
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
      const transaction = await this.prisma.nodePayment.findUnique({ where: { id } });
      if (!transaction) continue;

      await this.prisma.nodePayment.update({
        where: { id },
        data: { status: 'approved', completedAt: new Date() },
      });

      await this.walletService.debit({
        amount: Number(transaction.amount),
        reason: 'WITHDRAW',
        userId: transaction.userId ?? '',
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
      transaction.network as any,
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
          reason: 'USER_TOPUP',
          userId: transaction.userId ?? '',
          meta: {
            txid: transaction.id,
            address: transaction.address,
            network: transaction.network,
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
      transaction.network as any,
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

    return validation.confirmed ? transaction.status : 'NO';
  }

  @Get('get-withdraw-casino')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  getwithdrawcasino() {
    return this.nodePaymentsService.getWithdrawListAdmin();
  }
}
