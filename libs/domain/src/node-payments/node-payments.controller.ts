import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Networks, NodePaymentsService } from './node-payments.service';

type PayloadDeposit = {
  event: 'deposit';
  timestamp: string;
  data: {
    txHash: string;
    tokenAddress: string;
    amount: number;
    network: string;
  };
};

@Controller('node-payments')
export class NodePaymentsController {
  constructor(private readonly nodePaymentsService: NodePaymentsService) {}

  @Post('webhook')
  async webhook(@Body() body: PayloadDeposit) {
    if (body.event == 'deposit') {
      console.log('webhook');
      console.log(body);
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
