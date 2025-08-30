import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@security/jwt.guard';
import { CurrentUser } from '@security/current-user.decorator';
import { TopupService } from './topup.service';
import { UserTopupDto } from './dto/user-topup.dto';
import {
  TopupResponseDto,
  TopupHistoryResponseDto,
} from './dto/topup-responses.dto';

@ApiTags('Wallet • Topup • Recargas')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('wallet/topup')
export class TopupController {
  constructor(private readonly svc: TopupService) {}

  // POST /v1/wallet/topup  (solo si ENABLE_DIRECT_TOPUP=true)
  @Post()
  @ApiCreatedResponse({
    description: 'Topup created successfully',
    type: TopupResponseDto,
  })
  async create(
    @CurrentUser() u: { userId: string },
    @Body() dto: UserTopupDto,
  ) {
    return this.svc.directTopup(u.userId, dto);
  }

  @Get('history')
  @ApiOkResponse({
    description: 'List of topup transactions',
    type: TopupHistoryResponseDto,
  })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', type: Number, required: false, example: 20 })
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
