import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { KycReviewService } from './kyc-review.service';
import { DecisionDto } from './dto/decision.dto';

@ApiTags('Admin • KYC')
@ApiBearerAuth('access-token')
@Controller('kyc/reviews')
export class KycReviewController {
  constructor(private readonly svc: KycReviewService) {}

  @Get()
  list(
    @Query('status') status: 'SUBMITTED' | 'UNDER_REVIEW' = 'UNDER_REVIEW',
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '25',
  ) {
    return this.svc.list(status, parseInt(page, 10), parseInt(pageSize, 10));
  }

  @Get(':submissionId')
  detail(@Param('submissionId') id: string) {
    return this.svc.detail(id);
  }

  @Post(':submissionId/under-review')
  take(@Param('submissionId') id: string /* @CurrentUser() reviewer */) {
    const reviewerId = 'admin'; // obténlo de req.user
    return this.svc.takeUnderReview(id, reviewerId);
  }

  @Post(':submissionId/approve')
  approve(@Param('submissionId') id: string, @Body() dto: DecisionDto) {
    const reviewerId = 'admin';
    return this.svc.approve(id, reviewerId, dto.note);
  }

  @Post(':submissionId/reject')
  reject(@Param('submissionId') id: string, @Body() dto: DecisionDto) {
    const reviewerId = 'admin';
    return this.svc.reject(id, reviewerId, dto.note);
  }
}
