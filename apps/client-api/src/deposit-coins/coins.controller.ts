import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@security/jwt.guard';
import { CurrentUser } from '@security/current-user.decorator';
import {
  CreateDepositQRDto,
  CompleteTransactionDisruptiveCasinoDto,
} from './dto/deposit.dto';
import { NodePaymentsService } from '@domain/node-payments/node-payments.service';
import { google } from '@google-cloud/tasks/build/protos/protos';
import {
  addToQueue,
  getPathQueue,
} from 'apps/backoffice-api/src/googletask/utils';

@ApiTags('Deposit Coins')
@Controller('deposit-coins')
export class DepositCoinsController {
  constructor(private readonly nodePaymentsService: NodePaymentsService) {}

  @Get('list')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get history' })
  async list(@CurrentUser() user: { userId: string }) {
    return this.nodePaymentsService.getTransactionCasino(user.userId);
  }

  @Get('qr')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current QR payment' })
  async getqrmembership(@CurrentUser() user: { userId: string }) {
    return this.nodePaymentsService.getTransactionCasino(user.userId);
  }

  @Post('create-qr')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: CreateDepositQRDto })
  @ApiOperation({ summary: 'Create new QR payment' })
  async createqrmembership(
    @CurrentUser() user: { userId: string },
    @Body() body: CreateDepositQRDto,
  ) {
    return this.nodePaymentsService.createTransactionCasino(
      body.network,
      user.userId,
      body.amount,
    );
  }

  @Delete('cancel-qr')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel current QR payment' })
  async deleteqr(@CurrentUser() user: { userId: string }) {
    return this.nodePaymentsService.cancelTransactionCasino(user.userId);
  }

  @Post('polling')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: CompleteTransactionDisruptiveCasinoDto })
  @ApiOperation({ summary: 'Validate transaction status' })
  async polling(@Body() body: CompleteTransactionDisruptiveCasinoDto) {
    const transaction = await this.nodePaymentsService.getTransaction(
      body.address,
    );

    if (!transaction) throw new HttpException('not found', 401);
    if (transaction.get('status') != 'pending')
      throw new HttpException('completed', 401);

    const validation = await this.nodePaymentsService.validateStatus(
      transaction.get('network'),
      body.address,
    );

    if (validation.confirmed) {
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

    return validation.confirmed ? transaction.get('status') : 'NO';
  }
}
