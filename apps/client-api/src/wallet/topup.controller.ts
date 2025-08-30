import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@security/jwt.guard';
import { CurrentUser } from '@security/current-user.decorator';
import { TopupService } from './topup.service';
import { UserTopupDto } from './dto/user-topup.dto';

@ApiTags('Wallet • Topup')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('wallet/topup')
export class TopupController {
  constructor(private readonly svc: TopupService) {}

  // POST /v1/wallet/topup  (solo si ENABLE_DIRECT_TOPUP=true)
  @Post()
  async create(
    @CurrentUser() u: { userId: string },
    @Body() dto: UserTopupDto,
  ) {
    return this.svc.directTopup(u.userId, dto);
  }

  @Get('history')
  async history(
    @CurrentUser() u: { userId: string },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.svc.listMyTopups(
      u.userId,
      parseInt(page, 10),
      parseInt(pageSize, 10),
    );
  }
}
