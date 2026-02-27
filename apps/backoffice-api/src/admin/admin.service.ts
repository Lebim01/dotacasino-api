import { HttpException, Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import { BondsService } from '../bonds/bonds.service';
import { ADMIN_USER } from '../constants';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';
import { PrismaService } from 'libs/db/src/prisma.service';
import Decimal from 'decimal.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly bondsService: BondsService,
    private readonly authAcademyService: AuthAcademyService,
    private readonly prisma: PrismaService,
  ) {}

  async activationsWithVolumen() {
    const logs = await this.prisma.adminLog.findMany({
      where: { type: 'activation-volume' },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map((r) => ({ 
      id: r.id, 
      ...(r.data as any),
      created_at: r.createdAt 
    }));
  }

  async getEstimatedPayRewards() {
    const year = dayjs().year();
    const year_week = dayjs().isoWeek();

    const history = await this.prisma.adminRewardPayment.findUnique({
      where: { id: `${year}-${year_week}` },
    });

    if (history) {
      return {
        status: 'paid',
        percent: Number(history.percent),
        total: Number(history.total),
      };
    }

    const rewards_to_pay = await this.prisma.reward.findMany({
      where: {
        year,
        year_week,
        compoundInterest: false,
        status: 'pending',
      },
    });

    return {
      status: 'pending',
      percent: null,
      total:
        rewards_to_pay.reduce((a, b) => a + Number(b.depositAmount), 0) *
        0.02,
    };
  }

  async getNextEstimatedPayRewards() {
    const data = [];

    for (let i = 1; i <= 4; i++) {
      const date = dayjs().add(i, 'week');
      const year = date.year();
      const year_week = date.isoWeek();
      
      const rewards_to_pay = await this.prisma.reward.findMany({
        where: {
          year,
          year_week,
          compoundInterest: false,
          status: 'pending',
        },
      });

      const totalVolumen = rewards_to_pay.reduce(
        (a, b) => a + Number(b.depositAmount),
        0,
      );

      data.push({
        year,
        week: year_week,
        start_at: date.startOf('week').toISOString(),
        ends_at: date.endOf('week').toISOString(),
        volumen: totalVolumen,
        total: totalVolumen * 0.02,
      } as never);
    }

    return data;
  }

  async getPayRewards() {
    const year = dayjs().year();
    const year_week = dayjs().isoWeek();
    
    const rewards_to_pay = await this.prisma.reward.findMany({
      where: {
        year,
        year_week,
        compoundInterest: false,
        status: 'pending',
      },
      include: {
        deposit: true,
        user: true,
      },
    });

    return rewards_to_pay.map((r) => ({
      deposits: Number(r.deposit.amount),
      name: r.user.displayName,
      email: r.user.email,
    }));
  }

  async payReward(percent: number) {
    if (percent >= 1) return;

    const year = dayjs().year();
    const year_week = dayjs().isoWeek();

    const rewards_to_pay = await this.prisma.reward.findMany({
      where: {
        year,
        year_week,
        compoundInterest: false,
        status: 'pending',
      },
      include: {
        deposit: true,
        user: true,
      },
    });

    let total = 0;

    // Usamos una transacción para asegurar consistencia
    await this.prisma.$transaction(async (tx) => {
      for (const r of rewards_to_pay) {
        const amount = Number(r.deposit.amount) * percent;
        total += amount;

        // Update reward status
        await tx.reward.update({
          where: { id: r.id },
          data: {
            status: 'paid',
            amount: new Decimal(amount),
            compoundInterest: false,
          },
        });

        // Update deposit rewards focus
        await tx.deposit.update({
          where: { id: r.depositId },
          data: {
            rewardsPending: { increment: amount },
          },
        });

        // Log the reward payment for the user
        await tx.adminLog.create({
          data: {
            type: 'reward-payment-detail',
            userId: r.userId,
            targetId: r.depositId,
            data: {
              reward_id: r.id,
              user_name: r.user.displayName,
              user_email: r.user.email,
              amount,
            },
          },
        });

        // Execute bond logic
        await this.bondsService.execReward(r.userId, amount, {
          percent,
          deposit_id: r.depositId,
          reward_id: r.id,
        });
      }

      // Final payment log
      await tx.adminRewardPayment.create({
        data: {
          id: `${year}-${year_week}`,
          percent: new Decimal(percent),
          total: new Decimal(total),
          status: 'paid',
          year,
          week: year_week,
        },
      });
    });
  }

  async withdraws() {
    const pending_withdraw = await this.prisma.withdrawalRequest.findMany({
      where: { status: 'pending' },
      include: { user: true },
    });

    return pending_withdraw.map((r) => ({
      id: r.id,
      id_user: r.userId,
      name: r.user.displayName,
      email: r.user.email,
      amount: Number(r.amount),
      created_at: r.createdAt.toISOString(),
      wallet_usdt: r.walletUsdt,
      type: r.type,
      deposit_id: r.depositId,
    }));
  }

  async historyAdminActivationWithVolumen() {
    const logs = await this.prisma.adminLog.findMany({
      where: { type: 'activation-volume' },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map((r) => ({
      id: r.id,
      ...(r.data as any),
      created_at: r.createdAt.toISOString(),
    }));
  }

  async historyAdminActivationWithoutVolumen() {
    const logs = await this.prisma.adminLog.findMany({
      where: { type: 'activation-no-volume' },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map((r) => ({
      id: r.id,
      ...(r.data as any),
      created_at: r.createdAt.toISOString(),
    }));
  }

  async addPoints(id_user: string, side: 'left' | 'right', points: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: id_user },
    });
    if (!user) throw new Error('User not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.adminLog.create({
        data: {
          type: 'add-points',
          userId: id_user,
          data: {
            points,
            side,
            name: user.displayName,
          },
        },
      });

      // BinaryPoint history
      await tx.binaryPoint.create({
        data: {
          userId: id_user,
          points: new Decimal(points),
          side,
          type: 'history',
          concept: 'Added by Admin',
        },
      });

      // BinaryPoint matching (to be used in matching logic)
      await tx.binaryPoint.create({
        data: {
          userId: id_user,
          points: new Decimal(points),
          side,
          type: 'matching',
          concept: 'Added by Admin',
          expiresAt: dayjs().add(3, 'years').toDate(),
          originName: 'ADMIN',
          originUserId: ADMIN_USER,
          originEmail: user.email,
        },
      });
    });
  }

  async getHistoryAdminAddPoints() {
    const logs = await this.prisma.adminLog.findMany({
      where: { type: 'add-points' },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map((r) => ({
      id: r.id,
      ...(r.data as any),
      created_at: r.createdAt.toISOString(),
    }));
  }

  async blockuser(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new HttpException('User not exists', 401);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        membershipStatus: 'banned',
      },
    });
  }

  async denyWithdraw(id_withdraw: string) {
    const withdraw = await this.prisma.withdrawalRequest.findUnique({
      where: { id: id_withdraw },
    });
    if (!withdraw) throw new Error('Withdrawal not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.withdrawalRequest.update({
        where: { id: id_withdraw },
        data: { status: 'deny' },
      });

      const amount = Number(withdraw.amount);

      if (withdraw.type == 'deposit' && withdraw.depositId) {
        await tx.deposit.update({
          where: { id: withdraw.depositId },
          data: {
            rewardsPending: { decrement: amount },
          },
        });
      } else {
        await tx.user.update({
          where: { id: withdraw.userId },
          data: {
            [fieldBaseToPrisma(withdraw.type)]: { decrement: amount },
          } as any,
        });
      }
    });
  }

  async paidWithdraw(id_withdraw: string) {
    const withdraw = await this.prisma.withdrawalRequest.findUnique({
      where: { id: id_withdraw },
    });
    if (!withdraw) throw new Error('Withdrawal not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.withdrawalRequest.update({
        where: { id: id_withdraw },
        data: { status: 'paid' },
      });

      const amount = Number(withdraw.amount);

      if (withdraw.type == 'deposit' && withdraw.depositId) {
        await tx.deposit.update({
          where: { id: withdraw.depositId },
          data: {
            rewardsPending: { decrement: amount },
            rewardsBalance: { decrement: amount },
          },
        });
      } else {
        await tx.user.update({
          where: { id: withdraw.userId },
          data: {
            [fieldBaseToPrisma(withdraw.type)]: { decrement: amount },
          } as any,
        });
      }
    });
  }

  async coinpaymentsTransactions(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [transactions, totalCount] = await Promise.all([
      this.prisma.nodePayment.findMany({
        where: { paymentStatus: 'paid' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.nodePayment.count({
        where: { paymentStatus: 'paid' },
      }),
    ]);

    return {
      pageRecords: transactions.length,
      totalPages: Math.ceil(totalCount / limit),
      totalRecords: totalCount,
      data: await Promise.all(
        transactions.map(async (r) => {
          const user = r.userId ? await this.prisma.user.findUnique({ where: { id: r.userId } }) : null;
          return {
            ...r,
            created_at: r.createdAt.toISOString(),
            user_email: user?.email,
            user_name: user?.displayName,
          };
        }),
      ),
    };
  }

  async changeEmailUser(old_email: string, new_email: string) {
    const email_exists = await this.prisma.user.findUnique({
      where: { email: new_email },
    });

    if (email_exists) {
      throw new HttpException('email exists', 401);
    }

    const user = await this.prisma.user.findUnique({
      where: { email: old_email },
    });

    if (!user) {
      throw new HttpException('user not exists', 401);
    }

    await this.prisma.adminLog.create({
      data: {
        type: 'change-email',
        userId: user.id,
        data: { old_email, new_email },
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { email: new_email },
    });
  }

  async changePasswordUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new HttpException('user not exists', 401);
    }

    await this.prisma.adminLog.create({
      data: {
        type: 'change-password',
        userId: user.id,
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await this.authAcademyService.getPassword(password),
      },
    });
  }
}

function fieldBaseToPrisma(type: string): string {
  switch (type) {
    case 'rank': return 'bondRank';
    case 'direct': return 'bondDirect';
    case 'binary': return 'bondBinary';
    case 'rewards': return 'bondRewards';
    case 'residual': return 'bondResidual';
    case 'casino': return 'bondCasino';
    default: return 'bondRewards';
  }
}
