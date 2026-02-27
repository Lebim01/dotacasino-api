import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import { RanksService } from '../ranks/ranks.service';
import { getCapCurrentDeposits } from '../utils/deposits';
import { PrismaService } from 'libs/db/src/prisma.service';
import { Memberships } from '../types';

@Injectable()
export class ReportsService {
  constructor(
    private readonly ranksService: RanksService,
    private readonly prisma: PrismaService,
  ) {}

  async activeUsers(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [users, totalCount] = await Promise.all([
      this.prisma.user.findMany({
        where: { membershipStatus: 'paid' },
        orderBy: { membershipStartedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({
        where: { membershipStatus: 'paid' },
      }),
    ]);

    return {
      pageRecords: users.length,
      totalPages: Math.ceil(totalCount / limit),
      totalRecords: totalCount,
      data: users.map((r) => ({
        id: r.id,
        name: r.displayName,
        email: r.email,
        membership_started_at: r.membershipStartedAt?.toISOString(),
        membership: r.membership,
        rank: r.rank,
        sponsor_id: r.sponsorId,
        deposits: Number(r.totalDeposits || 0),
        left_points: 0, // Habría que calcular esto de BinaryPoint
        right_points: 0,
        balance: 0, // Habría que obtenerlo de Wallet
      })),
    };
  }

  async inactiveUsers(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [users, totalCount] = await Promise.all([
      this.prisma.user.findMany({
        where: { membershipStatus: 'expired' },
        orderBy: { membershipStartedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({
        where: { membershipStatus: 'expired' },
      }),
    ]);

    return {
      pageRecords: users.length,
      totalPages: Math.ceil(totalCount / limit),
      totalRecords: totalCount,
      data: users.map((r) => ({
        id: r.id,
        name: r.displayName,
        email: r.email,
        membership_started_at: r.membershipStartedAt?.toISOString(),
        membership_expired_at: r.membershipExpiresAt?.toISOString(),
        membership: r.membership,
        sponsor_id: r.sponsorId,
        balance: 0,
      })),
    };
  }

  async profitsHistory(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [profits, totalCount] = await Promise.all([
      this.prisma.profitDetail.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.profitDetail.count(),
    ]);

    return {
      pageRecords: profits.length,
      totalPages: Math.ceil(totalCount / limit),
      totalRecords: totalCount,
      data: profits.map((r) => {
        return {
          id: r.id,
          amount: Number(r.amount),
          created_at: r.createdAt.toISOString(),
          description: r.description,
          type: r.type,
          register_user_name: r.userName,
          benefited_user_name: '', // Podríamos obtenerlo si fuera necesario
          concept: '',
        };
      }),
    };
  }

  async usersInterest(page: number, limit: number, compound?: boolean) {
    const skip = (page - 1) * limit;
    const whereClause: any = {
      totalDeposits: { gt: 0 },
    };
    if (compound !== undefined) {
      whereClause.compoundInterest = compound;
    }

    const [users, totalCount] = await Promise.all([
      this.prisma.user.findMany({
        where: whereClause,
        orderBy: { totalDeposits: 'desc' },
        include: {
           Deposit: {
             orderBy: { nextReward: 'asc' },
             take: 1
           }
        },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where: whereClause }),
    ]);

    const data = users.map((r) => {
        const firstDeposit = r.Deposit[0];
        return {
          id: r.id,
          name: r.displayName,
          email: r.email,
          deposits: Number(r.totalDeposits || 0),
          paid: 0,
          membership: r.membership,
          is_compound_interest_active: r.compoundInterest || false,
          lack_time_to_pay: '',
          profits_interest: Number(r.bondRewards || 0),
          deposits_limit: Number(r.membershipLimitDeposits || 0),
          deposits_cap_current: getCapCurrentDeposits(
            Number(r.membershipCapCurrent || 0),
            Number(r.membershipLimitDeposits || 0),
          ),
          next_reward: firstDeposit?.nextReward ? dayjs(firstDeposit.nextReward).day(3).toISOString() : null,
        };
    });

    return {
      pageRecords: users.length,
      totalPages: Math.ceil(totalCount / limit),
      totalRecords: totalCount,
      data,
    };
  }

  async getCompanyBalance() {
    // entradas de dinero
    const incomePayments = await this.prisma.nodePayment.findMany({
        where: { paymentStatus: 'paid' }
    });
    const income = incomePayments.reduce(
      (a, b) => a + Number(b.amount),
      0,
    );

    // comisiones pendientes (balance en wallets)
    const wallets = await this.prisma.wallet.findMany({
        where: { balance: { gt: 0 } }
    });
    const pending_pay = wallets.reduce(
      (a, b) => a + Number(b.balance),
      0,
    );

    // pagado
    const paid = 0;

    // dinero en interes compuesto
    const compound_interest = 0;

    return {
      income,
      pending_pay,
      paid,
      compound_interest,
    };
  }

  async coinpaymentsTransactions(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [transactions, totalCount] = await Promise.all([
      this.prisma.nodePayment.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.nodePayment.count(),
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
            user_email: user?.email,
            user_name: user?.displayName,
          };
        }),
      ),
    };
  }

  async disruptiveTransactions(page: number, limit: number) {
    // Similar a coinpayments en este contexto si se guardan en la misma tabla
    return this.coinpaymentsTransactions(page, limit);
  }

  async usersranks(page: number, limit: number) {
    const response = await this.activeUsers(page, limit);

    for (const user of response.data) {
      user.rank = await this.ranksService.getRankUser(user.id);
    }

    return response;
  }

  async stats() {
    const [usersCount, membersActive, membersInactive, wallets, pendingWithdraw] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { membershipStatus: 'paid' } }),
        this.prisma.user.count({ where: { NOT: { membershipStatus: 'paid' } } }),
        this.prisma.wallet.aggregate({ _sum: { balance: true } }),
        this.prisma.withdrawalRequest.count({ where: { status: 'pending' } })
    ]);

    // Deberíamos iterar o usar una query más compleja para debt_interest si es necesario exacto
    // pero por ahora simplificamos o calculamos sobre una muestra
    const debt_interest = 0; 
    const profits = 0;

    const incomeReport = await this.prisma.systemReport.findUnique({ where: { id: 'income' } });

    return {
      balance: Number(wallets._sum.balance || 0),
      memberbers_active: membersActive,
      memberbers_inactive: membersInactive,
      debt_interest,
      profits,
      pending_withdraw: pendingWithdraw,
      income: incomeReport ? (incomeReport.data as any).total : 0,
    };
  }

  async monthIncomeReport() {
    const payments = await this.prisma.nodePayment.findMany({
        where: { paymentStatus: 'paid' }
    });

    const chartDataDeposits = new Array(12).fill(0);
    const chartDataMemberships = new Array(12).fill(0);

    for (const d of payments) {
      const date = dayjs(d.createdAt);
      const month = date.get('month');

      if (d.type == 'deposit') {
        chartDataDeposits[month] += Number(d.amount);
      }

      if (d.type == 'membership') {
        chartDataMemberships[month] += Number(d.amount);
      }
    }

    return {
      deposits: chartDataDeposits,
      memberships: chartDataMemberships,
    };
  }

  async getListRanksMonths() {
    // Esto podría venir de una tabla de cortes de rango
    return [{ yearmonth: dayjs().format('YYYY-MM') }];
  }

  async rankPromotion(year: number, month: number) {
    // Filtrar por el periodo year-month en RankPromotion
    const startDate = dayjs().year(year).month(month - 1).startOf('month').toDate();
    const endDate = dayjs().year(year).month(month - 1).endOf('month').toDate();

    const promotions = await this.prisma.rankPromotion.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return promotions.map((p) => ({
      id: p.id,
      user_id: p.userId,
      name: p.name,
      rank: p.rank,
      created_at: p.createdAt.toISOString(),
    }));
  }

  async getLastUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { membershipStartedAt: 'desc' },
      take: 6,
    });

    return users.map((r) => ({
      id: r.id,
      name: r.displayName,
      started_at: r.membershipStartedAt?.toISOString(),
      membership: r.membership,
    }));
  }

  async getLastInvoices() {
    const txs = await this.prisma.nodePayment.findMany({
      where: { paymentStatus: 'paid' },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    return await Promise.all(txs.map(async (r) => {
      const user = r.userId ? await this.prisma.user.findUnique({ where: { id: r.userId } }) : null;
      return {
        id: r.id,
        user_name: user?.displayName,
        user_email: user?.email,
        amount: Number(r.amount),
        type: r.type,
        created_at: r.createdAt.toISOString(),
      };
    }));
  }

  async usersBalances() {
    const users = await this.prisma.user.findMany({
        where: { profits: { gt: 0 } },
        orderBy: { profits: 'desc' }
    });

    return users.map((r) => ({
      id: r.id,
      name: r.displayName,
      email: r.email,
      balance: Number(r.profits),
      balance_bond_direct: Number(r.bondDirect),
      balance_bond_binary: Number(r.bondBinary),
      balance_bond_rewards: Number(r.bondRewards),
      balance_bond_rank: Number(r.bondRank),
    }));
  }

  async weeklyPaymentsById(id: string) {
    // Obtener pagos de AdminRewardPayment por año-semana del usuario dado
    const rewards = await this.prisma.reward.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
    });

    return rewards.map((r) => ({
      id: r.id,
      year: r.year,
      week: r.year_week,
      amount: Number(r.amount),
      status: r.status,
      deposit_amount: Number(r.depositAmount),
      compound_interest: r.compoundInterest,
      created_at: r.createdAt.toISOString(),
    }));
  }

  async weeklyPayments() {
    const payments = await this.prisma.adminRewardPayment.findMany({
        orderBy: { createdAt: 'desc' }
    });
    return payments.map((r) => ({
      ...r,
      created_at: r.createdAt.toISOString(),
    }));
  }

  async calendarPayments() {
    const FUTURE_WEEKS = 12;
    const data = [];

    for (let i = 1; i <= FUTURE_WEEKS; i++) {
        const date = dayjs().add(i, 'weeks');
        const year = date.year();
        const week = date.isoWeek();

        const rewards = await this.prisma.reward.findMany({
            where: {
                year,
                year_week: week,
                status: 'pending'
            }
        });

        const total = rewards.reduce((a, b) => a + Number(b.amount || 0), 0);

        data.push({
            year,
            week,
            total,
            start_week: date.startOf('week').toISOString(),
            end_week: date.endOf('week').toISOString(),
        } as never);
    }

    return data;
  }
}
