import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { WalletAdminService } from './wallet-admin.service';
import { QueryBalancesDto } from './dto/query-balances.dto';
import { TopupDto } from './dto/topup.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Admin • Wallet')
@ApiBearerAuth('access-token')
@Controller('wallets')
export class WalletAdminController {
  constructor(private readonly svc: WalletAdminService) {}

  // GET /wallets?search=email&page=1&pageSize=25
  @Get()
  async list(@Query() q: QueryBalancesDto) {
    return this.svc.listBalances(q);
  }

  // GET /wallets/:userId
  @Get(':userId')
  async getUser(@Param('userId') userId: string) {
    return this.svc.getUserBalance(userId);
  }

  // POST /wallets/:userId/topup
  @Post(':userId/topup')
  @HttpCode(HttpStatus.OK)
  // @Roles('admin')
  async topup(@Param('userId') userId: string, @Body() dto: TopupDto) {
    return this.svc.topup(userId, dto);
  }
}
