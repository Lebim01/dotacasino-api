import { Module } from '@nestjs/common';
import { CoinpaymentsController } from './coinpayments.controller';
import { CoinpaymentsService } from './coinpayments.service';

@Module({
  controllers: [CoinpaymentsController],
  providers: [CoinpaymentsService],
})
export class CoinpaymentsModule {}
