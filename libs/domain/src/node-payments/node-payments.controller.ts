import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Networks, NodePaymentsService } from './node-payments.service';

type PayloadDeposit = {
  event: 'deposit';
  timestamp: string;
  data: {
    txHash: string;
    network: string;
    netAmount: number;
    commission: number;
    grossAmount: number;
    tokenAddress: string;
    forwarderAddress: string;
  };
};

@Controller('node-payments')
export class NodePaymentsController {
  constructor(private readonly nodePaymentsService: NodePaymentsService) {}

  @Post('webhook')
  async webhook(@Body() body: PayloadDeposit) {
    if (body.event === 'deposit') {
      const address = body.data.forwarderAddress;
      if (!address) return;

      const transaction = await this.nodePaymentsService.getTransaction(address);
      if (!transaction || transaction.status === 'completed') return;

      if (transaction.type === 'academy' || transaction.type === 'dota_token') {
        const validation = await this.nodePaymentsService.validateStatus(
          transaction.network as Networks,
          address,
        );

        if (validation.confirmed) {
          await this.nodePaymentsService.completeTransaction(transaction.id);
          console.log(`[Unified Webhook] Confirmed completed payment for ${transaction.type} via address ${address}.`);
          
          if (transaction.type === 'dota_token') {
            await this.nodePaymentsService.notifyTokenPurchaseAdmins(transaction.id);
          }
        }
      }
    }
  }

  @Get('get-status')
  async getStatus(
    @Query('network') network: string,
    @Query('address') address: string,
  ) {
    return this.nodePaymentsService.validateStatus(network as Networks, address);
  }
}
