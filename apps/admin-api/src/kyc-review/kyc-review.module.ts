import { Module } from '@nestjs/common';
import { KycReviewController } from './kyc-review.controller';
import { KycReviewService } from './kyc-review.service';
import { PrismaService } from 'libs/db/src/prisma.service';

@Module({
  controllers: [KycReviewController],
  providers: [KycReviewService, PrismaService],
})
export class KycReviewModule {}
