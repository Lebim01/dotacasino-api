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
import { RequestWithUser } from '../types/jwt';
import { JWTAuthGuard } from '../auth/jwt/jwt-auth.guard';

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
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  activeCompoundInterest(@Request() request: RequestWithUser) {
    const { id } = request.user;
    return this.depositsService.activeCompoundInterest(id);
  }

  @Get('active-compound-interest')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JWTAuthGuard)
  async isactiveCompoundInterest(@Request() request: RequestWithUser) {
    const { id } = request.user;
    const user = await db.collection('users').doc(id).get();
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
