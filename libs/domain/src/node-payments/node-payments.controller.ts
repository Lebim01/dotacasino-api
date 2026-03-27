import { Body, Controller, Get, Logger, Post, Query } from '@nestjs/common';
import { Networks, NodePaymentsService } from './node-payments.service';
import { WalletService } from '@domain/wallet/wallet.service';

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
  private readonly logger = new Logger(NodePaymentsController.name);

  constructor(
    private readonly nodePaymentsService: NodePaymentsService,
    private readonly wallets: WalletService,
  ) { }

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

      else if (transaction.type == 'casino') {
        const validation = await this.nodePaymentsService.validateStatus(
          transaction.network as Networks,
          address,
        );

        if (validation.confirmed && transaction.userId) {
          const amountUsdt = validation.amount || Number(transaction.amount);

          await this.wallets.credit({
            userId: transaction.userId,
            amount: amountUsdt,
            meta: {
              provider: 'NODE_PAYMENTS',
              id_transaccion: transaction.id,
              network: transaction.network,
              address: address,
              tiene_aviso_deposito: false,
            },
            idempotencyKey: transaction.id,
            reason: 'USER_TOPUP',
          });

          this.logger.log(
            `Acreditado ${amountUsdt.toFixed(6)} USDT a ${transaction.userId} por deposito de NodePayments`,
          );

          await this.nodePaymentsService.completeTransaction(transaction.id);
          console.log(`[Unified Webhook] Confirmed completed payment for ${transaction.type} via address ${address}.`);
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
