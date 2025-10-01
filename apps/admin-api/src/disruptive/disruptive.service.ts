/* eslint-disable @typescript-eslint/no-unused-vars */
import { HttpException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { db } from 'apps/backoffice-api/src/firebase/admin';
import { dateToString } from 'apps/backoffice-api/src/utils/firebase';
import { Networks } from '@domain/disruptive/disruptive.service';

export const disruptiveUrl = axios.create({
  baseURL: 'https://my.disruptivepayments.io',
  headers: {
    'Content-Type': 'application/json',
    'client-api-key': process.env.DISRUPTIVE_APIKEY,
  },
});

const NETWORKS_ADDRESS: Record<Networks, string> = {
  BSC: '0x55d398326f99059fF775485246999027B3197955',
  TRX: '41a614f803b6fd780986a42c78ec9c7f77e6ded13c',
  ETH: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  POLYGON: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
};

@Injectable()
export class DisruptiveService {
  async getTransactionCasino(userid: string) {
    const docs = await db
      .collection('disruptive-casino')
      .where('userid', '==', userid)
      .where('status', '==', 'pending')
      .get();

    return docs.empty ? null : docs.docs[0].data();
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
      .where('status', '==', 'pending')
      .get()
      .then((r: any) => (r.empty ? null : r.docs[0]));
    return transaction;
  }
}
