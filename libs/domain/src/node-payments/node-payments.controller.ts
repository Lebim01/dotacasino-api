import { Body, Controller, Post } from '@nestjs/common';
//import { DepositsService } from 'src/deposits/deposits.service';

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
  @Post('webhook')
  async webhook(@Body() body: PayloadDeposit) {
    if (body.event == 'deposit') {
      console.log('webhook')
      console.log(body)
      /*await this.depositsService.handleDepositConfirmed({
        address: body.data.tokenAddress,
      });*/
    }
  }
}
