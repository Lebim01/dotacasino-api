/* eslint-disable @typescript-eslint/no-unused-vars */
import { google } from '@google-cloud/tasks/build/protos/protos';
import { HttpException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { Memberships } from 'apps/backoffice-api/src/types';
import { PrismaService } from 'libs/db/src/prisma.service';
import { WalletService } from '@domain/wallet/wallet.service';
import * as googleTaskService from 'apps/backoffice-api/src/googletask/utils';
import Decimal from 'decimal.js';

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
  constructor(
    private readonly walletService: WalletService,
    private readonly prisma: PrismaService,
  ) { }

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
      );
      const qrcode_url = `https://api.qrserver.com/v1/create-qr-code/?size=225x225&data=${address}`;

      const res = await this.prisma.nodePayment.create({
          data: {
            userId: user_id,
            amount: new Decimal(amount),
            expiresAt: expires_at,
            address: address,
            qrcodeUrl: qrcode_url,
            network: network,
            status: 'pending',
            type: 'academy',
            category: 'membership',
            paymentStatus: 'pending',
            processStatus: 'pending',
            isUpgrade: is_upgrade,
          }
      });

      await this.prisma.user.update({
        where: { id: user_id },
        data: {
          membership_link_disruptive: res.id,
        },
      });

      return { qrcode_url, address, expires_at: expires_at.toISOString(), amount };
    } catch (error) {
      console.error('error', error);
    }
  }

  async completeMembership(address: string) {
    const res = await this.prisma.nodePayment.findFirst({
        where: {
            address: address,
            type: 'academy',
            status: 'pending'
        }
    });

    if (res) {
      await this.sendActiveMembership(res.id);
      await this.prisma.nodePayment.update({
        where: { id: res.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        }
      });
    }
  }

  async createDeposit(user_id: string, amount: number) {
    try {
      const response = await this.generateDisruptivePayment('BSC', amount);
      const { address } = response.data;
      const expires_at = new Date(
        response.timeEnd + 15 * 60 * 1000,
      );
      const qrcode_url = `https://api.qrserver.com/v1/create-qr-code/?size=225x225&data=${address}`;

      const res = await this.prisma.nodePayment.create({
        data: {
          userId: user_id,
          amount: new Decimal(amount),
          expiresAt: expires_at,
          address,
          qrcodeUrl: qrcode_url,
          network: 'BSC',
          status: 'pending',
          type: 'academy',
          category: 'deposit',
          paymentStatus: 'pending',
          processStatus: 'pending',
        }
      });

      await this.prisma.user.update({
        where: { id: user_id },
        data: {
          deposit_link_disruptive: res.id,
        },
      });

      return { qrcode_url, address, expires_at: expires_at.toISOString(), amount };
    } catch (error) {
      console.error('error', error);
    }
  }

  async completedDeposit(address: string) {
    const res = await this.prisma.nodePayment.findFirst({
      where: {
        address: address,
        type: 'academy',
        status: 'pending'
      }
    });

    if (res) {
      await this.sendActiveDeposit(res.id);
      await this.prisma.nodePayment.update({
        where: { id: res.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        }
      });
    }
  }

  async getTransactionCasino(user_id: string) {
    const txn = await this.prisma.nodePayment.findFirst({
        where: {
            userId: user_id,
            type: 'casino',
            category: 'deposit',
            status: 'pending'
        }
    });

    return txn;
  }

  async createDisruptiveTransactionCasino(
    network: Networks,
    user_id: string,
    amount: number,
  ) {
    try {
      const response = await this.generateDisruptivePayment(network, amount);
      const { address } = response.data;
      const expires_at = new Date(
        response.timeEnd + 15 * 60 * 1000,
      );
      const qrcode_url = `https://api.qrserver.com/v1/create-qr-code/?size=225x225&data=${address}`;

      await this.prisma.nodePayment.create({
        data: {
          userId: user_id,
          amount: new Decimal(amount),
          expiresAt: expires_at,
          address,
          qrcodeUrl: qrcode_url,
          network,
          status: 'pending',
          type: 'casino',
          category: 'deposit',
        }
      });

      return { qrcode_url, address, expires_at: expires_at.toISOString(), amount };
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

        const foundsBalance =
          Number(res.data.data.fundsGoal) ==
          Number(res.data.data.currentBalance);

        return (
          status == 'COMPLETED' ||
          (status == 'FUNDED' && foundsGoal) ||
          (status == 'EXPIRED' && foundsBalance)
        );
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
        url: `https://backoffice-api-1039762081728.us-central1.run.app/v1/deposits/ipn`,
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
        url: `https://backoffice-api-1039762081728.us-central1.run.app/v1/subscriptions/ipn`,
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

  async cancelDisruptiveTransactionCasino(user_id: string) {
    const res = await this.prisma.nodePayment.findFirst({
      where: {
        userId: user_id,
        type: 'casino',
        category: 'deposit',
        status: 'pending'
      }
    });

    if (res) {
      await this.prisma.nodePayment.update({
        where: { id: res.id },
        data: {
          status: 'cancelled',
          completedAt: new Date(),
        }
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

  async requestWithdraw(user_id: string, amount: number, address: string) {
    const doc = await this.prisma.nodePayment.findFirst({
      where: {
        userId: user_id,
        type: 'casino',
        category: 'withdraw',
        status: 'pending'
      }
    });

    if (doc) {
      await this.prisma.nodePayment.update({
        where: { id: doc.id },
        data: {
          amount: { increment: amount },
        }
      });
    } else {
      await this.prisma.nodePayment.create({
        data: {
          type: 'casino',
          category: 'withdraw',
          status: 'pending',
          userId: user_id,
          amount: new Decimal(amount),
          address,
        }
      });
    }
  }

  async cancelDisruptiveWithdrawCasino(user_id: string) {
    const doc = await this.prisma.nodePayment.findFirst({
      where: {
        userId: user_id,
        type: 'casino',
        category: 'withdraw',
        status: 'pending'
      }
    });

    if (doc) {
      await this.prisma.nodePayment.update({
        where: { id: doc.id },
        data: {
          status: 'cancelled',
        }
      });
    }
  }

  async getWithdrawList(user_id: string) {
    const txs = await this.prisma.nodePayment.findMany({
      where: {
        userId: user_id,
        type: 'casino',
        category: 'withdraw'
      }
    });

    return txs.map((r) => ({
      id: r.id,
      address: r.address,
      amount: Number(r.amount),
      created_at: r.createdAt.toISOString(),
      user_id: r.userId,
      status: r.status,
    }));
  }

  async getWithdrawListAdmin() {
    const txs = await this.prisma.nodePayment.findMany({
      where: {
        type: 'casino',
        category: 'withdraw',
        status: 'pending'
      }
    });

    return txs.map((r) => ({
      id: r.id,
      address: r.address,
      amount: Number(r.amount),
      created_at: r.createdAt.toISOString(),
      user_id: r.userId,
    }));
  }

  async getTransaction(address: string) {
    const transaction = await this.prisma.nodePayment.findFirst({
      where: { address: address }
    });
    return transaction;
  }

  async getTransactionAcademy(address: string) {
    const transaction = await this.prisma.nodePayment.findFirst({
      where: {
        address: address,
        type: 'academy',
        status: 'pending'
      }
    });
    return transaction;
  }
}
