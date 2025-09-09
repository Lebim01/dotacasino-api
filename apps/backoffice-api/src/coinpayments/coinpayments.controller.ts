/* eslint-disable @typescript-eslint/no-unused-vars */
import { Controller, Post, Req, Res, Request, Response } from '@nestjs/common';
import { CoinpaymentsService } from './coinpayments.service';
import { db } from '../firebase/admin';
import { ApiExcludeController } from '@nestjs/swagger';
import { firestore } from 'firebase-admin';

@ApiExcludeController()
@Controller('coinpayments')
export class CoinpaymentsController {
  constructor(private readonly coinPaymentsService: CoinpaymentsService) {}

  @Post('ipn')
  async notificationIpn(@Req() request: Request, @Res() response: Response) {
    const { isComplete, payload, isPartial } =
      await this.coinPaymentsService.getNotificationIpn(request, response);

    const transaction_ref = db.collection('coinpayments').doc(payload.txn_id);
    await transaction_ref
      .collection('ipn')
      .add({ ...payload, created_at: new Date() });

    if (isPartial) {
      await transaction_ref.update({
        payment_status: 'confirming',
      });
    } else if (isComplete) {
      const transaction = await transaction_ref.get();

      if (transaction.get('payment_status') != 'paid') {
        /**
         * Change status
         */
        await transaction_ref.update({
          payment_status: 'paid',
          total: payload.received_amount,
        });

        try {
          await db
            .collection('reports')
            .doc('income')
            .update({
              total: firestore.FieldValue.increment(
                Number(payload.received_amount),
              ),
            });
        } catch (err) {
          console.error('Error increment income report');
          console.error(err);
        }
      }

      try {
        /**
         * Get document
         */
        const transaction = await transaction_ref.get();

        if (transaction.get('type') == 'membership') {
          // activar membresia
          await this.coinPaymentsService.sendActiveMembership(payload.txn_id);
        } else if (transaction.get('type') == 'deposit') {
          // sumar deposito
          await this.coinPaymentsService.sendActiveDeposit(payload.txn_id);
        }
      } catch (error) {
        console.error('Ocurrio un error al actualizar al sponsor', error);
      }
    }

    return 'pago actualizado con exito';
  }
}
