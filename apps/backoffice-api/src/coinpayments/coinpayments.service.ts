/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { db } from '../firebase/admin';
import { CreateTransactionResponse } from './types';
import { google } from '@google-cloud/tasks/build/protos/protos';
import * as googleTaskService from '../googletask/utils';

interface CreateDBTransaction extends CreateTransactionResponse {
  user_id: string;
  user_name: string;
  user_email: string;
  type: 'deposit' | 'membership';
  membership_type: Memberships | null;
  fake?: boolean;
  is_upgrade: boolean;
  total: string; // includes fee
}

@Injectable()
export class CoinpaymentsService {
  private readonly apiKey = process.env.COINPAYMENTS_PK;
  private readonly apiSecret = process.env.COINPAYMENTS_SK;
  private readonly baseUrl = 'https://www.coinpayments.net/api.php';

  constructor() {}

  async createdbTransaction(data: CreateDBTransaction) {
    const expires_at = this.expiresAt(data.timeout);
    await db
      .collection('coinpayments')
      .doc(data.txn_id)
      .set({
        ...data,
        original_amount: data.amount,
        expires_at: expires_at.toISOString(),
        created_at: new Date(),
        payment_status: 'pending',
        process_status: 'pending',
      });
    return data.txn_id;
  }

  async createTransaction(
    user_id: string,
    type: 'deposit' | 'membership',
    data: {
      amount: number;
      membership_type?: Memberships;
      is_upgrade?: boolean;
    },
  ) {
    const user = await db.collection('users').doc(user_id).get();
    const amount =
      type == 'deposit'
        ? (data.amount * 1.01).toString()
        : data.amount?.toString();
    const currency1 = 'USDT';
    const currency2 = 'USDT.BEP20';
    const payload = {
      amount,
      cmd: 'create_transaction',
      currency1,
      currency2,
      key: this.apiKey,
      version: '1',
      format: 'json',
      buyer_email: user.get('email'),
    };
    const headers = this.generateHeaders(payload);
    const _response = await axios.post(
      this.baseUrl,
      new URLSearchParams(payload as any),
      { headers },
    );
    const response = _response.data.result as CreateTransactionResponse;
    try {
      const txn_id = await this.createdbTransaction({
        ...response,
        total: amount,
        amount: data.amount.toString(),
        type,
        membership_type: data.membership_type || null,
        user_id,
        user_name: user.get('name'),
        user_email: user.get('email'),
        is_upgrade: data.is_upgrade || false,
      });

      if (type == 'membership') {
        await db.collection('users').doc(user_id).update({
          membership_link_coinpayments: txn_id,
        });
      }
      if (type == 'deposit') {
        await db.collection('users').doc(user_id).update({
          deposit_link_coinpayments: txn_id,
        });
      }
    } catch (error) {
      console.log('el error es', error);
      return error;
    }

    return response;
  }

  private generateHeaders(payload: any) {
    const hmac = crypto.createHmac('sha512', this.apiSecret!);
    hmac.update(new URLSearchParams(payload).toString());
    return { HMAC: hmac.digest('hex') };
  }

  expiresAt(timeout: number) {
    const actual_date = new Date();
    const calculated = actual_date.getTime() + timeout * 1000;
    const newTimeOut = new Date(calculated);
    return newTimeOut;
  }

  async getNotificationIpn(request: any, response: any) {
    const payload = request.body;
    const secret = '12345';
    // const hmacHeader = request.headers['hmac'] as string;

    // const hmac = crypto.createHmac('sha512', secret);
    // hmac.update(new URLSearchParams(payload).toString());
    // const calculatedHmac = hmac.digest('hex');

    // if (hmacHeader === calculatedHmac) {
    if (Number(payload.status) == 0)
      return { isComplete: false, payload, isPartial: false };

    if (Number(payload.status) == 1)
      return { isPartial: true, payload, isComplete: false };

    try {
      const isComplete = Number(payload.status) == 100;
      return { isComplete, payload, isPartial: false };
    } catch (error) {
      return { isComplete: false, payload };
    }
  }

  async sendActiveMembership(txn_id: string) {
    type Method = 'POST';
    const task: google.cloud.tasks.v2.ITask = {
      httpRequest: {
        httpMethod: 'POST' as Method,
        url: `${process.env.API_URL}/subscriptions/ipn`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: Buffer.from(
          JSON.stringify({
            txn_id,
          }),
        ),
      },
    };

    await googleTaskService.addToQueue(
      task,
      googleTaskService.getPathQueue('active-user-membership'),
    );
  }

  async sendActiveDeposit(txn_id: string) {
    type Method = 'POST';
    const task: google.cloud.tasks.v2.ITask = {
      httpRequest: {
        httpMethod: 'POST' as Method,
        url: `${process.env.API_URL}/deposits/ipn`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: Buffer.from(
          JSON.stringify({
            txn_id,
          }),
        ),
      },
    };

    await googleTaskService.addToQueue(
      task,
      googleTaskService.getPathQueue('active-user-deposit'),
    );
  }
}
