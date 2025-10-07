/* eslint-disable @typescript-eslint/no-unused-vars */
import { google } from '@google-cloud/tasks/build/protos/protos';
import { HttpException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { CasinoService } from '../casino/casino.service';
import { firestore } from 'firebase-admin';
import { Memberships } from 'apps/backoffice-api/src/types';
import { db } from 'apps/backoffice-api/src/firebase/admin';
import { dateToString } from 'apps/backoffice-api/src/utils/firebase';
import * as googleTaskService from 'apps/backoffice-api/src/googletask/utils';
import { WalletService } from '@domain/wallet/wallet.service';

export const disruptiveUrl = axios.create({
  baseURL: 'https://my.disruptivepayments.io',
  headers: {
    'Content-Type': 'application/json',
    'client-api-key': process.env.DISRUPTIVE_APIKEY,
  },
});

export type Networks = 'BSC' | 'TRX' | 'ETH' | 'POLYGON';

export const NETWORKS: Record<Networks, { network: string; protocol: string }> =
  {
    BSC: {
      network: 'BSC',
      protocol: 'BEP20',
    },
    ETH: {
      network: 'ETH',
      protocol: 'ERC20',
    },
    POLYGON: {
      network: 'POLYGON',
      protocol: 'ERC20',
    },
    TRX: {
      network: 'TRC',
      protocol: 'USDT',
    },
  };

const NETWORKS_ADDRESS: Record<Networks, string> = {
  BSC: '0x55d398326f99059fF775485246999027B3197955',
  TRX: '41a614f803b6fd780986a42c78ec9c7f77e6ded13c',
  ETH: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  POLYGON: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
};

@Injectable()
export class DisruptiveService {
  constructor(private readonly walletService: WalletService) {}

  async generateDisruptivePayment(network: Networks, amount: number) {
    const url = '/api/payments/single';

    const body = {
      network,
      fundsGoal: amount,
      smartContractAddress: NETWORKS_ADDRESS[network],
    };
    try {
      const response = await disruptiveUrl.post(url, body);
      return response.data;
    } catch (error: any) {
      console.error('Fallo al obtener el address', error.response);
    }
  }

  async createMembership(
    user_id: string,
    membership_type: Memberships,
    network: Networks,
    amount: number,
    is_upgrade = false,
  ) {
    try {
      const response = await this.generateDisruptivePayment(network, amount);
      const { address } = response.data;
      const expires_at = new Date(
        response.timeEnd + 15 * 60 * 1000,
      ).toISOString();
      const qrcode_url = `https://api.qrserver.com/v1/create-qr-code/?size=225x225&data=${address}`;

      const res = await db.collection('disruptive-academy').add({
        user_id,
        membership_type,
        amount,
        expires_at,
        address,
        qrcode_url,
        network: 'BSC',
        created_at: new Date(),
        status: 'pending',
        type: 'membership',
        payment_status: 'pending',
        process_status: 'pending',
        is_upgrade,
      });

      await db.collection('users').doc(user_id).update({
        membership_link_disruptive: res.id,
      });

      return { qrcode_url, address, expires_at, amount };
    } catch (error) {
      console.error('error', error);
    }
  }

  async completeMembership(address: string) {
    const res = await db
      .collection('disruptive-academy')
      .where('address', '==', address)
      .where('status', '==', 'pending')
      .get()
      .then((r: any) => (r.empty ? null : r.docs[0]));

    if (res) {
      await this.sendActiveMembership(res.id);
      await res.ref.update({
        status: 'completed',
        completed_at: new Date(),
      });
    }
  }

  async createDeposit(user_id: string, amount: number) {
    try {
      const response = await this.generateDisruptivePayment('BSC', amount);
      const { address } = response.data;
      const expires_at = new Date(
        response.timeEnd + 15 * 60 * 1000,
      ).toISOString();
      const qrcode_url = `https://api.qrserver.com/v1/create-qr-code/?size=225x225&data=${address}`;

      const res = await db.collection('disruptive-academy').add({
        user_id,
        amount,
        expires_at,
        address,
        qrcode_url,
        network: 'BSC',
        created_at: new Date(),
        status: 'pending',
        type: 'deposit',
        payment_status: 'pending',
        process_status: 'pending',
      });

      await db.collection('users').doc(user_id).update({
        deposit_link_disruptive: res.id,
      });

      return { qrcode_url, address, expires_at, amount };
    } catch (error) {
      console.error('error', error);
    }
  }

  async completedDeposit(address: string) {
    const res = await db
      .collection('disruptive-academy')
      .where('address', '==', address)
      .where('status', '==', 'pending')
      .get()
      .then((r: any) => (r.empty ? null : r.docs[0]));

    if (res) {
      await this.sendActiveDeposit(res.id);
      await res.ref.update({
        status: 'completed',
        completed_at: new Date(),
      });
    }
  }

  async getTransactionCasino(userid: string) {
    const docs = await db
      .collection('disruptive-casino')
      .where('userid', '==', userid)
      .where('status', '==', 'pending')
      .get();

    return docs.empty ? null : docs.docs[0].data();
  }

  async createDisruptiveTransactionCasino(
    network: Networks,
    userid: string,
    amount: number,
  ) {
    try {
      const response = await this.generateDisruptivePayment(network, amount);
      const { address } = response.data;
      const expires_at = new Date(
        response.timeEnd + 15 * 60 * 1000,
      ).toISOString();
      const qrcode_url = `https://api.qrserver.com/v1/create-qr-code/?size=225x225&data=${address}`;

      const doc = await db.collection('disruptive-casino').add({
        userid,
        amount,
        expires_at,
        address,
        qrcode_url,
        network,
        created_at: new Date(),
        status: 'pending',
      });

      await db.collection('casino-transactions').doc(doc.id).set({
        type: 'deposit',
        status: 'pending',
        created_at: new Date(),
        amount,
        userid,
        address,
      });

      return { qrcode_url, address, expires_at, amount };
    } catch (error) {
      console.error('error', error);
    }
  }

  async validateStatus(network: Networks, address: string) {
    try {
      const url = `/api/payments/status?network=${network}&address=${address}`;

      type Response = {
        data: {
          network: string;
          address: string;
          amountCaptured: number;
          smartContractAddress: string;
          smartContractSymbol: 'USDT';
          status: string;
          fundStatus: string;
          processStep: number;
          processTotalSteps: number;
          fundsGoal: number;
          fundsExpirationAt: number;
          fundsExpirationAtUTC: string;
          currentBalance: number;
          forwardAddresses: {
            address: string;
            status: string;
            amount: number;
          }[];
        };
        timeStart: number;
        timeEnd: number;
        timeDelta: number;
      };
      const res = await disruptiveUrl.get<Response>(url);

      if (res.data.data.fundStatus) {
        const status = res.data.data.fundStatus;
        const foundsGoal =
          Number(res.data.data.fundsGoal) ==
          Number(res.data.data.amountCaptured);

        return status == 'COMPLETED' || (status == 'FUNDED' && foundsGoal);
      }

      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
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

  async cancelDisruptiveTransactionCasino(userid: string) {
    const res = await db
      .collection('disruptive-casino')
      .where('userid', '==', userid)
      .where('status', '==', 'pending')
      .get()
      .then((r: any) => (r.empty ? null : r.docs[0]));

    if (res) {
      await res.ref.update({
        status: 'cancelled',
        cancel_at: new Date(),
      });

      await db.collection('casino-transactions').doc(res.id).update({
        status: 'cancelled',
        cancel_at: new Date(),
      });
    }
  }

  async sendWithdraw(payload: { address: string; amount: number }[]) {
    const body = {
      network: 'BSC',
      smartContractAddress: NETWORKS_ADDRESS.BSC,
      name: 'casino withdraw',
      eventGetSymbol: 'USDT',
      massPaymentType: 1,
      accounts: payload,
    };

    type Response = {
      data: {
        address: string;
        network: string;
        fundsGoal: number;
        smartContractAddress: string;
      };
      timeStart: number;
      timeEnd: number;
      timeDelta: number;
    };

    try {
      const url = '/api/payments/mass';
      const response = await disruptiveUrl.post<Response>(url, body);

      return {
        address: response.data.data.address,
        fundsGoal: response.data.data.fundsGoal,
        network: response.data.data.network,
      };
    } catch (err: any) {
      throw new HttpException(err.response.data, 403);
    }
  }

  async requestWithdraw(userid: string, amount: number, address: string) {
    const doc = await db
      .collection('casino-transactions')
      .where('userid', '==', userid)
      .where('type', '==', 'withdraw')
      .where('status', '==', 'pending')
      .get()
      .then((r: any) => (r.empty ? null : r.docs[0]));

    if (doc) {
      await doc.ref.update({
        amount: firestore.FieldValue.increment(amount),
      });
    } else {
      await db.collection('casino-transactions').add({
        type: 'withdraw',
        status: 'approved',
        created_at: new Date(),
        userid,
        amount,
        address,
      });
    }
  }

  async cancelDisruptiveWithdrawCasino(userid: string) {
    const doc = await db
      .collection('casino-transactions')
      .where('userid', '==', userid)
      .where('type', '==', 'withdraw')
      .where('status', '==', 'pending')
      .get()
      .then((r: any) => (r.empty ? null : r.docs[0]));

    if (doc) {
      await doc.ref.update({
        status: 'cancelled',
      });
    }
  }

  async getWithdrawList(userid: string) {
    const docs = await db
      .collection('casino-transactions')
      .where('userid', '==', userid)
      .where('type', '==', 'withdraw')
      .get();

    return docs.docs.map((r: any) => ({
      id: r.id,
      address: r.get('address'),
      amount: r.get('amount'),
      created_at: dateToString(r.get('created_at')),
      userid: r.get('userid'),
      status: r.get('status'),
    }));
  }

  async getWithdrawListAdmin() {
    const docs = await db
      .collection('casino-transactions')
      .where('type', '==', 'withdraw')
      .where('status', '==', 'pending')
      .get();

    return docs.docs.map((r: any) => ({
      id: r.id,
      address: r.get('address'),
      amount: r.get('amount'),
      created_at: dateToString(r.get('created_at')),
      userid: r.get('userid'),
    }));
  }

  async getTransaction(address: string) {
    const transaction = await db
      .collection('disruptive-casino')
      .where('address', '==', address)
      .get()
      .then((r: any) => (r.empty ? null : r.docs[0]));
    return transaction;
  }

  async getTransactionAcademy(address: string) {
    const transaction = await db
      .collection('disruptive-academy')
      .where('address', '==', address)
      .where('status', '==', 'pending')
      .get()
      .then((r: any) => (r.empty ? null : r.docs[0]));
    return transaction;
  }
}
