import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@security/jwt.guard';
import { CurrentUser } from '@security/current-user.decorator';
import { ClientWalletService } from './wallet.service';
import { QueryLedgerDto } from './dto/query-ledger.dto';
import { BalanceResponseDto } from './dto/balance-response.dto';
import { LedgerResponseDto } from './dto/ledger-response.dto';

@ApiTags('Wallet')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: ClientWalletService) {}

  @Get()
  @ApiOkResponse({
    description: 'Get current wallet balance',
    type: BalanceResponseDto
  })
  async getBalance(@CurrentUser() user: { userId: string }) {
    return this.wallet.getBalance(user.userId);
  }

  @Get('ledger')
  @ApiOkResponse({
    description: 'Get wallet transaction history',
    type: LedgerResponseDto
  })
  async getLedger(
    @CurrentUser() user: { userId: string },
    @Query() q: QueryLedgerDto,
  ) {
    return this.wallet.getLedger(user.userId, q);
  }
}
