import { Module } from '@nestjs/common';
import { AgWebhookController } from './ag-webhook.controller';
import { AgWebhookService } from './ag-webhook.service';

@Module({
  controllers: [AgWebhookController],
  providers: [AgWebhookService],
})
export class AgWebhookModule {}
