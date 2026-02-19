import { NodePaymentsService } from '@domain/node-payments/node-payments.service';
import { StdMexWebhookDto } from '@domain/stdmex/dto/webhook.dto';
import { StdMexService } from '@domain/stdmex/stdmex.service';
import { google } from '@google-cloud/tasks/build/protos/protos';
import { Controller, Headers, Post, Body, Logger, HttpException } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { addToQueue, getPathQueue } from 'apps/backoffice-api/src/googletask/utils';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class NodePaymentsWebhookDto {
  @ApiProperty()
  @IsString()
  txHash!: string;

  @ApiProperty()
  @IsString()
  tokenAddress!: string;

  @ApiProperty()
  @IsNumber()
  amount!: number;

  @ApiProperty()
  @IsString()
  network!: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  receiverAddress!: string;

  @ApiProperty()
  @IsNumber()
  commission?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  netAmount?: number;
}

@ApiTags('Admin • DEPOSITS')
@Controller('deposits')
export class DepositsController {
  private readonly logger = new Logger(DepositsController.name, {
    timestamp: true,
  });

  constructor(
    private readonly stdmex: StdMexService,
    private readonly nodePayments: NodePaymentsService,
  ) { }

  @Post('webhook')
  webhook(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: StdMexWebhookDto,
  ) {
    return this.stdmex.handleWebhook(authorization, body);
  }

  @Post('node-payments/webhook')
  async nodePaymentsWebhook(
    @Body() body: NodePaymentsWebhookDto,
  ) {
    const transaction = await this.nodePayments.getTransaction(
      body.tokenAddress,
    );

    if (!transaction) throw new HttpException('not found', 401);

    const validation = await this.nodePayments.validateStatus(
      transaction.get('network'),
      body.tokenAddress,
    );

    if (validation.confirmed && transaction.get('type') === 'casino') {
      type Method = 'POST';
      const task: google.cloud.tasks.v2.ITask = {
        httpRequest: {
          httpMethod: 'POST' as Method,
          url: `https://backoffice-api-1039762081728.us-central1.run.app/v1/disruptive/completed-transaction-casino`,
          headers: {
            'Content-Type': 'application/json',
          },
          body: Buffer.from(
            JSON.stringify({
              txHash: body.txHash,
              address: body.tokenAddress,
              amount: body.amount,
              network: body.network,
              receiverAddress: body.receiverAddress,
            }),
          ),
        },
      };
      await addToQueue(task, getPathQueue('disruptive-complete'));
    }

    if (validation.confirmed && transaction.get('type') === 'academy') {
      type Method = 'POST';
      const task: google.cloud.tasks.v2.ITask = {
        httpRequest: {
          httpMethod: 'POST' as Method,
          url: `https://backoffice-api-1039762081728.us-central1.run.app/v1/subscriptions/ipn`,
          headers: {
            'Content-Type': 'application/json',
          },
          body: Buffer.from(
            JSON.stringify({
              txn_id: transaction.id,
            }),
          ),
        },
      };

      await addToQueue(task, getPathQueue('active-user-membership'));
    }

    return validation.confirmed ? transaction.get('status') : 'NO';
  }
}
