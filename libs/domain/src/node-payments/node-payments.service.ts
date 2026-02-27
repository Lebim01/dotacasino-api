import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import axios from 'axios';
import Decimal from 'decimal.js';

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
    } catch (error: any) {
      console.error('Error validating deposit status:', error.response.data);
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

  async getTransactionCasino(user_id: string) {
    return await this.prisma.nodePayment.findFirst({
        where: {
            userId: user_id,
            type: 'casino',
            category: 'deposit',
            status: 'pending'
        }
    });
  }

  async createTransactionCasino(
    network: Networks,
    user_id: string,
    amount: number,
  ) {
    try {
      const response = await this.createAddress(network, user_id, amount);
      const { address, expires_at, qrcode_url } = response;

      await this.prisma.nodePayment.create({
          data: {
            userId: user_id,
            amount: new Decimal(amount),
            expiresAt: new Date(expires_at),
            address,
            qrcodeUrl: qrcode_url,
            network,
            status: 'pending',
            type: 'casino',
            category: 'deposit',
          }
      });

      return { qrcode_url, address, expires_at: expires_at, amount };
    } catch (error) {
      console.error('error', error);
    }
  }

  async cancelTransactionCasino(user_id: string) {
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

  async getTransaction(address: string) {
    return await this.prisma.nodePayment.findFirst({
      where: { address: address }
    });
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

  async cancelWithdrawCasino(user_id: string) {
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
    return await this.prisma.nodePayment.findFirst({
      where: {
        address: address,
        type: 'academy',
        status: 'pending'
      }
    });
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

      const res = await this.prisma.nodePayment.create({
        data: {
          userId: user_id,
          category: membership_type,
          amount: new Decimal(amount),
          expiresAt: new Date(expires_at),
          address,
          qrcodeUrl: qrcode_url,
          network,
          status: 'pending',
          type: 'academy',
          paymentStatus: 'pending',
          processStatus: 'pending',
          isUpgrade: is_upgrade,
        }
      });

      await this.prisma.user.update({
        where: { id: user_id },
        data: {
          membership_link_disruptive: res.id,
        }
      });

      return { qrcode_url, address, expires_at: expires_at, amount };
    } catch (error) {
      console.error('error', error);
    }
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

  async createDepositTransaction(
    user_id: string,
    amount: number,
    network: Networks = 'BSC',
  ) {
    try {
      const response = await this.createAddress(network, user_id, amount);
      const { address, expires_at, qrcode_url } = response;

      await this.prisma.nodePayment.create({
        data: {
          userId: user_id,
          amount: new Decimal(amount),
          expiresAt: new Date(expires_at),
          address,
          qrcodeUrl: qrcode_url,
          network,
          status: 'pending',
          type: 'academy',
          category: 'deposit',
        }
      });

      await this.prisma.user.update({
        where: { id: user_id },
        data: {
          deposit_link_disruptive: address,
        }
      });

      return { qrcode_url, address, expires_at: expires_at, amount };
    } catch (error) {
      console.error('error', error);
    }
  }
}
