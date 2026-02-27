import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import { BinaryService } from '../binary/binary.service';
import { BondsService } from '../bonds/bonds.service';
import { currentMultiplier } from '../utils/deposits';
import { PrismaService } from 'libs/db/src/prisma.service';
import Decimal from 'decimal.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class DepositsService {
  constructor(
    private readonly binaryService: BinaryService,
    private readonly bondsService: BondsService,
    private readonly prisma: PrismaService,
  ) {}

  async makedeposit(id_user: string, amount: number, txn_id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: id_user },
    });
    if (!user) throw new Error('User not found');

    const start_to_comission_at = dayjs().day(1).add(2, 'weeks').startOf('day');

    const user_acceleration = await currentMultiplier(id_user, this.prisma as any);
    if (!user_acceleration) throw new Error('Could not calculate multiplier');

    const accelerate_deposit =
      user_acceleration.membership.current > 0
        ? user_acceleration.membership.current > amount
          ? amount
          : user_acceleration.membership.current
        : 0;

    const deposit = await this.prisma.deposit.create({
      data: {
        id: txn_id,
        userId: id_user,
        amount: new Decimal(amount),
        rewardsBalance: new Decimal(0),
        rewardsGenerated: new Decimal(0),
        rewardsWithdrawed: new Decimal(0),
        rewardsPending: new Decimal(0),
        createdAt: new Date(),
        nextReward: start_to_comission_at.toDate(),
      },
    });

    if (user.compoundInterest) {
      await this.insertRewardsCompound(id_user, deposit.id, amount);
    } else {
      await this.insertRewards(id_user, deposit.id, amount);
    }

    await this.binaryService.increaseBinaryPoints(
      id_user,
      amount,
      'Inversión',
      txn_id,
    );

    await this.bondsService.execUserDirectBond(id_user, amount, {
      deposit_id: deposit.id,
      concept: 'Añadir valor',
    });

    await this.prisma.user.update({
      where: { id: id_user },
      data: {
        totalDeposits: { increment: amount },
        deposit_link_coinpayments: null,
        deposit_link_disruptive: null,
      },
    });
  }

  async activeCompoundInterest(id_user: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: id_user },
    });
    if (!user) return;

    if (!user.compoundInterest) {
      const deposits = await this.prisma.deposit.findMany({
        where: { userId: id_user },
      });
      for (const d of deposits) {
        await this.updateRewardsCompound(id_user, d.id);
      }
      await this.prisma.user.update({
        where: { id: id_user },
        data: {
          compoundInterest: true,
        },
      });
    }
  }

  async insertRewards(
    user_id: string,
    deposit_id: string,
    deposit_amount: number,
  ) {
    const start_at = dayjs().day(1).add(2, 'week').startOf('day');
    const rewardsData: Prisma.RewardCreateManyInput[] = [];

    for (let i = 1; i <= 15 * 4; i++) {
      const date = dayjs(start_at).add(i, 'week');
      rewardsData.push({
        userId: user_id,
        depositId: deposit_id,
        year: date.year(),
        year_week: date.isoWeek(),
        compoundInterest: false,
        depositAmount: new Decimal(deposit_amount),
        status: 'pending',
        createdAt: new Date(),
      });
    }

    await this.prisma.reward.createMany({
      data: rewardsData,
    });
  }

  async updateRewardsCompound(user_id: string, deposit_id: string) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { id: deposit_id },
    });
    if (!deposit) return;

    // Eliminar recompensas pendientes
    await this.prisma.reward.deleteMany({
      where: {
        depositId: deposit_id,
        status: 'pending',
      },
    });

    const deposit_amount = Number(deposit.amount);
    const start_at = Number(deposit.rewardsGenerated) == 0
        ? dayjs(deposit.createdAt)
        : dayjs().day(1).add(3, 'weeks').startOf('day');

    const percent_by_month = 7.6 / 100;
    let amountTotal = deposit_amount;
    const rewardsData: Prisma.RewardCreateManyInput[] = [];

    for (let i = 1; i <= 15; i++) {
      const commission = Math.floor(amountTotal * percent_by_month * 100) / 100;
      const date = dayjs(start_at).add(i - 1, 'month');
      
      rewardsData.push({
        userId: user_id,
        depositId: deposit_id,
        year: date.year(),
        year_week: date.isoWeek(),
        amount: new Decimal(commission),
        compoundInterest: true,
        depositAmount: new Decimal(amountTotal),
        status: 'pending',
        createdAt: new Date(),
      });
      amountTotal += commission;
    }

    await this.prisma.reward.createMany({
       data: rewardsData
    });

    await this.prisma.deposit.update({
      where: { id: deposit_id },
      data: {
        compoundInterest: true,
        rewardsBalance: 0,
      },
    });
  }

  async insertRewardsCompound(
    user_id: string,
    deposit_id: string,
    deposit_amount: number,
  ) {
    const start_at = dayjs().day(1).add(3, 'weeks').startOf('day');
    const percent_by_month = 7.6 / 100;
    let amountTotal = deposit_amount;
    const rewardsData: Prisma.RewardCreateManyInput[] = [];

    for (let i = 1; i <= 15; i++) {
      const commission = amountTotal * percent_by_month;
      const date = dayjs(start_at).add(i, 'month');
      
      rewardsData.push({
        userId: user_id,
        depositId: deposit_id,
        year: date.year(),
        year_week: date.isoWeek(),
        amount: new Decimal(commission),
        compoundInterest: true,
        depositAmount: new Decimal(amountTotal),
        status: 'pending',
        createdAt: new Date(),
      });
      amountTotal += commission;
    }
    
    await this.prisma.reward.createMany({
       data: rewardsData
    });
  }
}
