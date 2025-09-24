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

@Controller('disruptive')
export class DisruptiveController {
  constructor(
    private readonly disruptiveService: DisruptiveService,
    private readonly casinoService: CasinoService,
  ) {}

  @Post('create-transaction-deposit')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async createtransactionacademy(
    @CurrentUser() { userId }: { userId: string },
    @Body() body: CreateDepositDto,
  ) {
    return this.disruptiveService.createDeposit(userId, body.amount);
  }

  @Post('completed-transaction-deposit')
  async completedtransactiondeposit(
    @Body() body: CompleteTransactionDisruptiveCasinoDto,
  ) {
    return this.disruptiveService.completedDeposit(body.address);
  }

  @Post('completed-transaction-membership')
  async completedtransactionmembership(
    @Body() body: CompleteTransactionDisruptiveCasinoDto,
  ) {
    return this.disruptiveService.completeMembership(body.address);
  }

  @Post('cancel-transaction-casino')
  async canceltransactioncasino(
    @Body() body: CompleteTransactionDisruptiveCasinoDto,
  ) {
    return this.disruptiveService.cancelDisruptiveTransactionCasino(
      body.address,
    );
  }

  @Post('cancel-withdraw-casino')
  async cancelwithdrawcasino(@Body() body: UserTokenDTO) {
    return this.disruptiveService.cancelDisruptiveWithdrawCasino(
      body.usertoken,
    );
  }

  @Post('create-transaction-casino')
  async createtransactioncasino(
    @Body() body: CreateTransactionDisruptiveCasinoDto,
  ) {
    return this.disruptiveService.createDisruptiveTransactionCasino(
      body.network,
      body.usertoken,
      body.amount,
      body.cashier,
    );
  }

  @Post('withdraw-casino')
  async withdrawcasino(@Body() body: CreateWithdrawCasino) {
    const balance = await this.casinoService.getBalance(body.usertoken);
    const pending = await this.disruptiveService.getPendingAmount(
      body.usertoken,
    );
    if (balance >= body.amount + pending) {
      await this.disruptiveService.requestWithdraw(
        body.cashier,
        body.usertoken,
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
      const d = await db.collection('disruptive-casino').doc(id).get();
      transactions.push({
        id: d.id,
        address: d.get('address'),
        amount: d.get('amount'),
      });
    }

    const { address, fundsGoal, network } =
      await this.disruptiveService.sendWithdraw(transactions);

    return {
      address,
      fundsGoal,
      network,
    };
  }

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

      const cashier = transaction.get('cashier');
      const userid = transaction.get('userid');
      const amount = transaction.get('amount');

      await transaction.ref.update({
        status: 'approved',
        approved_at: new Date(),
      });
      await this.casinoService.removeCredits(cashier, userid, amount);
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

        return this.casinoService.addCredits(
          transaction.get('cashier'),
          transaction.get('usertoken'),
          transaction.get('amount'),
          transaction.id,
        );
      }
    }

    return 'FAIL';
  }

  @Post('polling')
  async polling(@Body() body: CompleteTransactionDisruptiveCasinoDto) {
    const transaction = await this.disruptiveService.getTransaction(
      body.address,
    );

    if (!transaction) throw new HttpException('not found', 401);

    const status = await this.disruptiveService.validateStatus(
      transaction.get('network'),
      body.address,
    );

    if (status) {
      type Method = 'POST';
      const task: google.cloud.tasks.v2.ITask = {
        httpRequest: {
          httpMethod: 'POST' as Method,
          url: `${process.env.API_URL}/disruptive/completed-transaction-casino`,
          headers: {
            'Content-Type': 'application/json',
          },
          body: Buffer.from(JSON.stringify(body)),
        },
      };
      await addToQueue(task, getPathQueue('disruptive-complete'));
    }

    return status ? transaction.get('status') : 'NO';
  }

  @Post('get-transactions')
  async gettransactions(@Body() body: UserTokenDTO) {
    const userid = await this.casinoService.getIdUser(body.usertoken);
    return this.casinoService.getTransactions(userid);
  }

  @Get('get-withdraw-casino')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(USER_ROLES.ADMIN)
  async getwithdrawcasino() {
    return this.disruptiveService.getWithdrawList();
  }
}
