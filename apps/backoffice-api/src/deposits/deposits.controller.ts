import {
  Controller,
  Post,
  Body,
  Request,
  UseGuards,
  Get,
} from '@nestjs/common';
import { DepositsService } from './deposits.service';
import { db } from '../firebase/admin';
import { ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { JwtAuthGuard } from '@security/jwt.guard';
import { CurrentUser } from '@security/current-user.decorator';

@Controller('deposits')
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Post('ipn')
  @ApiExcludeEndpoint()
  async ipn(@Body() body: any) {
    if (!body.txn_id) throw new Error('INVALID');

    const txn = await db
      .collection('disruptive-academy')
      .doc(body.txn_id)
      .get();

    if (
      !txn.exists ||
      !['paid', 'admin-activation'].includes(txn.get('payment_status')) ||
      txn.get('process_status') == 'completed'
    ) {
    } else {
      /**
       * Sumar el deposito
       */
      await this.depositsService.makedeposit(
        txn.get('user_id'),
        Number(txn.get('amount')),
        txn.id,
      );

      await txn.ref.update({
        process_status: 'completed',
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
    const user = await db.collection('users').doc(userId).get();
    const deposits = await user.ref.collection('deposits').get();
    return {
      is_active: user.get('compound_interest') || false,
      rewards_generated:
        deposits.docs.reduce(
          (a, b) => a + (b.get('rewards_generated') || 0),
          0,
        ) || 0,
      rewards_balance: deposits.docs.reduce(
        (a, b) => a + b.get('rewards_balance'),
        0,
      ),
    };
  }
}
