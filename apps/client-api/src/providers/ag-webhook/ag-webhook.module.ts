import { Module } from '@nestjs/common';
import { AgWebhookController } from './ag-webhook.controller';
import { AgWebhookService } from './ag-webhook.service';
import { WalletService } from '@domain/wallet/wallet.service';

@Module({
  controllers: [AgWebhookController],
  providers: [AgWebhookService, WalletService],
})
export class AgWebhookModule {}
