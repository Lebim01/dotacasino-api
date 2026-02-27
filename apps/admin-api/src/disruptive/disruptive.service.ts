/* eslint-disable @typescript-eslint/no-unused-vars */
import { HttpException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { Networks } from '@domain/disruptive/disruptive.service';
import { PrismaService } from 'libs/db/src/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  async getTransactionCasino(user_id: string) {
    return this.prisma.nodePayment.findFirst({
      where: {
        userId: user_id,
        type: 'casino',
        category: 'deposit',
        status: 'pending',
      },
    });
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
    const docs = await this.prisma.nodePayment.findMany({
      where: {
        type: 'casino',
        category: 'withdraw',
        status: 'pending',
      },
    });

    return docs.map((r) => ({
      id: r.id,
      address: r.address,
      amount: Number(r.amount),
      created_at: r.createdAt.toISOString(),
      user_id: r.userId,
    }));
  }

  async getTransaction(address: string) {
    return this.prisma.nodePayment.findFirst({
      where: { address, status: 'pending' },
    });
  }
}
