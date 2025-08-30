import { Module } from '@nestjs/common';
import { KycReviewController } from './kyc-review.controller';
import { KycReviewService } from './kyc-review.service';

@Module({
  controllers: [KycReviewController],
  providers: [KycReviewService],
})
export class KycReviewModule {}
