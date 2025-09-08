import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@security/jwt.guard';
import { CurrentUser } from '@security/current-user.decorator';
import { ReferralService } from './referral.service';
import { AttachReferralDto } from './dto/attach-referral.dto';
import { QueryReferralsDto } from './dto/query-referrals.dto';

@ApiTags('Referral')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('referrals')
export class ReferralController {
  constructor(private readonly svc: ReferralService) {}

  // POST /v1/referrals/attach  { refCode }
  @Post('attach')
  @ApiExcludeEndpoint()
  attach(@CurrentUser() u: { userId: string }, @Body() dto: AttachReferralDto) {
    return this.svc.attachByCode(u.userId, dto.refCode.trim());
  }

  // GET /v1/referrals/direct?page=1&pageSize=25
  @Get('direct')
  direct(@CurrentUser() u: { userId: string }, @Query() q: QueryReferralsDto) {
    return this.svc.listDirectReferrals(u.userId, q.page, q.pageSize);
  }

  // GET /v1/referrals/tree?maxDepth=7
  @Get('tree')
  tree(@CurrentUser() u: { userId: string }, @Query() q: QueryReferralsDto) {
    return this.svc.tree(u.userId, q.maxDepth);
  }
}
