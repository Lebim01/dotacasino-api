import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import axios from 'axios';
import { db } from 'apps/backoffice-api/src/firebase/admin';

const URL = 'https://node-payments-api-560114584030.us-central1.run.app';

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

@Injectable()
export class NodePaymentsService {
  constructor(private readonly prisma: PrismaService) { }

  async createAddress(
    network: 'ETH' | 'BSC' | 'TRX' | 'POLYGON',
    userId: string,
    amount: number,
  ) {
    const response = await axios.post<{
      address: string;
      expiresAt: string;
    }>(
      `${URL}/api/deposit-addresses`,
      { network, userId, amount },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': `${process.env.NODE_PAYMENTS_API_KEY}`,
        },
      },
    );

    const qrcode_url = `https://api.qrserver.com/v1/create-qr-code/?size=225x225&data=${response.data.address}`;

    return {
      address: response.data.address,
      amount,
      network,
      expires_at: response.data.expiresAt,
      qrcode_url,
    };
  }

  async validateStatus(network: Networks, address: string) {
    try {
      const response = await axios.get<{
        userId: string;
        network: string;
        address: string;
        status:
        | 'COMPLETED'
        | 'PENDING'
        | 'EXPIRED'
        | 'PARTIAL_COMPLETED'
        | 'CANCELLED';
        expiresAt: string;
        expectedAmount: number;
        collectedAmount: number | null;
        collectedAt: string | null;
        cancelledAt: string | null;
        createdAt: string;
      }>(`${URL}/api/deposit-addresses/`, {
        params: {
          network,
          address,
        },
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': `${process.env.NODE_PAYMENTS_API_KEY}`,
        },
      });

      return {
        confirmed: response.data.status === 'COMPLETED',
        status: response.data.status,
        txHash: response.data.collectedAt,
        amount: response.data.collectedAmount,
        userId: response.data.userId,
        network: response.data.network,
        address: response.data.address,
        expiresAt: response.data.expiresAt,
        expectedAmount: response.data.expectedAmount,
        collectedAmount: response.data.collectedAmount,
        collectedAt: response.data.collectedAt,
        cancelledAt: response.data.cancelledAt,
        createdAt: response.data.createdAt,
      };
    } catch (error) {
      console.error('Error validating deposit status:', error);
      return {
        confirmed: false,
        status: 'PENDING' as const,
        txHash: undefined,
        amount: undefined,
        userId: undefined,
        network: undefined,
        address: undefined,
        expiresAt: undefined,
        expectedAmount: undefined,
        collectedAmount: undefined,
        collectedAt: undefined,
        cancelledAt: undefined,
        createdAt: undefined,
      };
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

  async createTransactionCasino(
    network: Networks,
    userid: string,
    amount: number,
  ) {
    try {
      const response = await this.createAddress(network, userid, amount);
      const { address, expires_at, qrcode_url } = response;

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

  async cancelTransactionCasino(userid: string) {
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

  async getTransaction(address: string) {
    const transaction = await db
      .collection('disruptive-casino')
      .where('address', '==', address)
      .get()
      .then((r: any) => (r.empty ? null : r.docs[0]));
    return transaction;
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
      created_at: r.get('created_at')?.toDate()?.toISOString() || '',
      userid: r.get('userid'),
      status: r.get('status'),
    }));
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
        amount: (doc.data().amount || 0) + amount,
      });
    } else {
      await db.collection('casino-transactions').add({
        type: 'withdraw',
        status: 'pending',
        created_at: new Date(),
        userid,
        amount,
        address,
      });
    }
  }

  async cancelWithdrawCasino(userid: string) {
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

  async sendWithdraw(payload: { address: string; amount: number }[]) {
    const body = {
      network: 'BSC',
      smartContractAddress: '0x55d398326f99059fF775485246999027B3197955',
      name: 'casino withdraw',
      eventGetSymbol: 'USDT',
      massPaymentType: 1,
      accounts: payload,
    };

    try {
      const response = await axios.post(`${URL}/api/payments/mass`, body, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': `${process.env.NODE_PAYMENTS_API_KEY}`,
        },
      });

      return response.data;
    } catch (err: any) {
      throw new HttpException(err.response?.data || 'Withdraw failed', 403);
    }
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

  async createMembershipTransaction(
    user_id: string,
    membership_type: string,
    network: Networks,
    amount: number,
    is_upgrade = false,
  ) {
    try {
      const response = await this.createAddress(network, user_id, amount);
      const { address, expires_at, qrcode_url } = response;

      const res = await db.collection('disruptive-academy').add({
        user_id,
        membership_type,
        amount,
        expires_at,
        address,
        qrcode_url,
        network,
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
      created_at: r.get('created_at')?.toDate()?.toISOString() || '',
      userid: r.get('userid'),
    }));
  }

  async createDepositTransaction(
    user_id: string,
    amount: number,
    network: Networks = 'BSC',
  ) {
    try {
      const response = await this.createAddress(network, user_id, amount);
      const { address, expires_at, qrcode_url } = response;

      await db.collection('disruptive-academy').add({
        user_id,
        amount,
        expires_at,
        address,
        qrcode_url,
        network,
        created_at: new Date(),
        status: 'pending',
        type: 'deposit',
      });

      await db.collection('users').doc(user_id).update({
        topup_link_disruptive: address,
      });

      return { qrcode_url, address, expires_at, amount };
    } catch (error) {
      console.error('error', error);
    }
  }
}
