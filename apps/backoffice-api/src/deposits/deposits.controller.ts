import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
} from '@nestjs/common';
import { DepositsService } from './deposits.service';
import { ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { JwtAuthGuard } from '@security/jwt.guard';
import { CurrentUser } from '@security/current-user.decorator';
import { PrismaService } from 'libs/db/src/prisma.service';

@Controller('deposits')
export class DepositsController {
  constructor(
    private readonly depositsService: DepositsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('ipn')
  @ApiExcludeEndpoint()
  async ipn(@Body() body: any) {
    if (!body.txn_id) throw new Error('INVALID');

    const txn = await this.prisma.nodePayment.findUnique({
      where: { id: body.txn_id },
    });

    if (
      !txn ||
      !['paid', 'admin-activation'].includes(txn.paymentStatus!) ||
      txn.processStatus == 'completed'
    ) {
       return 'INVALID';
    } else {
      /**
       * Sumar el deposito
       */
      await this.depositsService.makedeposit(
        txn.userId!,
        Number(txn.amount),
        txn.id,
      );

      await this.prisma.nodePayment.update({
        where: { id: txn.id },
        data: {
          processStatus: 'completed',
        },
      });
    }
  }

  @Post('active-compound-interest')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  activeCompoundInterest(@CurrentUser() user: { userId: string }) {
    return this.depositsService.activeCompoundInterest(user.userId);
  }

  @Get('active-compound-interest')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async isactiveCompoundInterest(
    @CurrentUser() { userId }: { userId: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        Deposit: true,
      },
    });
    if (!user) throw new Error('User not found');

    return {
      is_active: user.compoundInterest || false,
      rewards_generated:
        user.Deposit.reduce(
          (a, b) => a + Number(b.rewardsGenerated || 0),
          0,
        ) || 0,
      rewards_balance: user.Deposit.reduce(
        (a, b) => a + Number(b.rewardsBalance || 0),
        0,
      ),
    };
  }
}
