import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@security/jwt.guard';
import { CurrentUser } from '@security/current-user.decorator';
import { CreateQRDto } from './dto/registeracademy.dto';
import { DisruptiveService } from '@domain/disruptive/disruptive.service';
import { CasinoService } from '@domain/casino/casino.service';

@ApiTags('Withdraw Coins')
@Controller('withdraw-coins')
export class CoinsController {
  constructor(
    private readonly disruptiveService: DisruptiveService,
    private readonly casinoService: CasinoService,
  ) {}

  @Get('list')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  getlist(@CurrentUser() user: { userId: string }) {
    return this.disruptiveService.getWithdrawList(user.userId);
  }

  @Post('create')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: CreateQRDto })
  @ApiOperation({ summary: 'Create QR payment' })
  async createqrmembership(
    @CurrentUser() user: { userId: string },
    @Body() body: CreateQRDto,
  ) {
    const balance = await this.casinoService.getBalance(user.userId);
    const pending = await this.disruptiveService.getPendingAmount(user.userId);
    if (balance >= body.amount + pending) {
      await this.disruptiveService.requestWithdraw(
        user.userId,
        body.amount,
        body.address,
      );
      return {
        status: true,
        message: 'request_withdraw_success',
      };
    } else {
      return {
        status: false,
        message: 'not_enought_balance',
      };
    }
  }

  @Delete('cancel')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel' })
  async deleteqr(@CurrentUser() user: { userId: string }) {
    return this.disruptiveService.cancelDisruptiveWithdrawCasino(user.userId);
  }
}
