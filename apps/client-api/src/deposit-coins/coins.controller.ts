import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@security/jwt.guard';
import { CurrentUser } from '@security/current-user.decorator';
import { CreateQRDto } from './dto/deposit.dto';
import { DisruptiveService } from '@domain/disruptive/disruptive.service';

@ApiTags('Deposit Coins')
@Controller('deposit-coins')
export class DepositCoinsController {
  constructor(private readonly disruptiveService: DisruptiveService) {}

  @Get('list')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get history' })
  async list(@CurrentUser() user: { userId: string }) {
    return this.disruptiveService.getTransactionCasino(user.userId);
  }

  @Get('qr')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current QR payment' })
  async getqrmembership(@CurrentUser() user: { userId: string }) {
    return this.disruptiveService.getTransactionCasino(user.userId);
  }

  @Post('create-qr')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: CreateQRDto })
  @ApiOperation({ summary: 'Create new QR payment' })
  async createqrmembership(
    @CurrentUser() user: { userId: string },
    @Body() body: CreateQRDto,
  ) {
    return this.disruptiveService.createDisruptiveTransactionCasino(
      body.network,
      user.userId,
      body.amount,
    );
  }

  @Delete('cancel-qr')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel current QR payment' })
  async deleteqr(@CurrentUser() user: { userId: string }) {
    return this.disruptiveService.cancelDisruptiveTransactionCasino(
      user.userId,
    );
  }
}
