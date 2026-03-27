import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import axios from 'axios';
import Decimal from 'decimal.js';
import * as nodemailer from 'nodemailer';

const URL = 'https://api.nodepayments.io';

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

  async completeTransaction(transactionId: string) {
    return await this.prisma.nodePayment.update({
      where: { id: transactionId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      }
    });
  }

  async notifyTokenPurchaseAdmins(transactionId: string) {
    const tx = await this.prisma.nodePayment.findUnique({
      where: { id: transactionId },
    });

    if (!tx) return;

    const user = tx.userId ? await this.prisma.user.findUnique({ where: { id: tx.userId } }) : null;

    const emails = [
      'Mentemillonaria1708@gmail.com',
      'Allanvitalmaldonado@gmail.com',
      'victoralvarezsaucedo@gmail.com'
    ];

    const transporter = nodemailer.createTransport({
      host: process.env.MAILER_HOST!,
      port: Number(process.env.MAILER_PORT ?? 587),
      secure: false,
      auth: process.env.MAILER_USER ? { user: process.env.MAILER_USER, pass: process.env.MAILER_PASSWORD } : undefined,
    });

    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #4F46E5;">¡Nueva Compra Confirmada de DOTA TOKEN! 🚀</h2>
        <p>El sistema ha recibido y confirmado automáticamente un pago exitoso por conceptos de tokens.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Usuario:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${user?.email || 'Desconocido'}</td></tr>
          <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Nombre:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${user?.firstName || ''} ${user?.lastName || ''}</td></tr>
          <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Inversión Cancelada:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee; color: #10B981; font-weight: bold;">${tx.amount} USDT</td></tr>
          <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Cálculo estimado:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${(Number(tx.amount) / 0.1).toFixed(0)} TOKENS</td></tr>
          <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Billetera destino (Metamask):</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee; word-break: break-all;"><code>${user?.walletUsdt || 'No registrada'}</code></td></tr>
        </table>
        
        <p style="margin-top: 30px; font-size: 12px; color: #777;">Por favor, realiza la dispersión manual de los Tokens hacial la wallet destino del cliente listada arriba.</p>
      </div>
    `;

    try {
      if (process.env.MAILER_DISABLED === 'true') {
        console.warn('[DEV] Email disabled naturally in env configurations, skipping sending token purchase notifications.');
        return;
      }

      await transporter.sendMail({
        from: process.env.MAILER_FROM ?? 'noreply@dotacasino.com',
        to: emails,
        subject: '💰 Compra Exitosa - DOTA TOKEN Recibido',
        html,
      });
      console.log('Admin notification email sent successfully for DOTA TOKEN purchase.');
    } catch (err) {
      console.error('Failed to send admin notification email:', err);
    }
  }

  async createTokenSalePurchase(
    network: Networks,
    user_id: string,
    amount_usdt: number,
    wallet: string
  ) {
    try {
      const tokenSaleResponse = await axios.post<{
        purchaseId: string;
        paymentAddress: string;
        expectedPaymentAmount: number;
        paymentToken: string;
        network: string;
      }>(
        `${URL}/api/token-sales/cmmtxlr0i0001u4ys6on4sy3w/purchase`,
        { amountTokens: amount_usdt * 10, buyerAddress: wallet },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': `${process.env.NODE_PAYMENTS_API_KEY}`,
          },
        },
      );

      const address = tokenSaleResponse.data.paymentAddress;
      const expectedAmount = tokenSaleResponse.data.expectedPaymentAmount;
      const expires_at = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
      const qrcode_url = `https://api.qrserver.com/v1/create-qr-code/?size=225x225&data=${address}`;

      await this.prisma.$transaction(async (tx) => {
        await tx.nodePayment.create({
          data: {
            userId: user_id,
            amount: new Decimal(expectedAmount),
            expiresAt: new Date(expires_at),
            address,
            qrcodeUrl: qrcode_url,
            network,
            status: 'pending',
            type: 'dota_token',
            category: 'purchase',
            walletUsdt: wallet
          }
        });
      });

      return { qrcode_url, address, expires_at, amount: expectedAmount };
    } catch (error: any) {
      console.error('error', error.response.data);
      throw new HttpException('Token purchase error', 500);
    }
  }

  async getTokenTransaction(user_id: string) {
    const tx = await this.prisma.nodePayment.findFirst({
      where: {
        userId: user_id,
        type: 'dota_token',
        category: 'purchase',
        status: 'pending'
      }
    });
    if (!tx) return null;
    return {
      qrcode_url: tx.qrcodeUrl,
      address: tx.address,
      expires_at: tx.expiresAt,
      amount: Number(tx.amount),
      wallet: tx.walletUsdt
    };
  }

  async cancelTokenTransaction(user_id: string) {
    const res = await this.prisma.nodePayment.findFirst({
      where: {
        userId: user_id,
        type: 'dota_token',
        category: 'purchase',
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
