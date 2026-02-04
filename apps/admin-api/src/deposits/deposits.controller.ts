import { NodePaymentsService } from '@domain/node-payments/node-payments.service';
import { StdMexWebhookDto } from '@domain/stdmex/dto/webhook.dto';
import { StdMexService } from '@domain/stdmex/stdmex.service';
import { google } from '@google-cloud/tasks/build/protos/protos';
import { Controller, Headers, Post, Body, Logger, HttpException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { addToQueue, getPathQueue } from 'apps/backoffice-api/src/googletask/utils';

export class NodePaymentsWebhookDto {
  txHash!: string;
  tokenAddress!: string;
  amount!: number;
  network!: string;
  receiverAddress!: string;
  commission?: number;
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
  ) {}

  @Post('webhook')
  webhook(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: StdMexWebhookDto,
  ) {
    return this.stdmex.handleWebhook(authorization, body);
  }

  @Post('node-payments/webhook')
  async nodePaymentsWebhook(
    @Headers('authorization') authorization: string | undefined,
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

    if (validation.confirmed) {
      type Method = 'POST';
      const task: google.cloud.tasks.v2.ITask = {
        httpRequest: {
          httpMethod: 'POST' as Method,
          url: `${process.env.API_URL}/disruptive/completed-transaction-casino`,
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

    return validation.confirmed ? transaction.get('status') : 'NO';
  }
}
