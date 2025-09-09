import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import { db } from '../firebase/admin';
import { RanksService } from '../ranks/ranks.service';
import { getCapCurrentDeposits } from '../utils/deposits';
import { dateToString } from '../utils/firebase';

@Injectable()
export class ReportsService {
  constructor(private readonly ranksService: RanksService) {}

  async activeUsers(page: number, limit: number) {
    const query =
      page > 1
        ? db
            .collection('users')
            .where('membership_status', '==', 'paid')
            .orderBy('membership_started_at', 'desc')
            .offset((page - 1) * limit)
            .limit(limit)
        : db
            .collection('users')
            .where('membership_status', '==', 'paid')
            .orderBy('membership_started_at', 'desc')
            .limit(limit);

    const snap = await query.get();

    const totalRecords = await db
      .collection('users')
      .where('membership_status', '==', 'paid')
      .count()
      .get();

    return {
      pageRecords: snap.size,
      totalPages: Math.ceil(totalRecords.data().count / limit),
      totalRecords: totalRecords.data().count,
      data: snap.docs.map((r) => ({
        id: r.id,
        name: r.get('name'),
        email: r.get('email'),
        membership_started_at: dateToString(r.get('membership_started_at')),
        membership: r.get('membership'),
        rank: r.get('rank'),
        sponsor_id: r.get('sponsor_id'),
        deposits: r.get('deposits') || 0,
        left_points: r.get('left_points'),
        right_points: r.get('right_points'),
        balance: r.get('balance'),
      })),
    };
  }

  async inactiveUsers(page: number, limit: number) {
    const query =
      page > 1
        ? db
            .collection('users')
            .where('membership_status', '==', 'expired')
            .orderBy('membership_started_at', 'desc')
            .offset((page - 1) * limit)
            .limit(limit)
        : db
            .collection('users')
            .where('membership_status', '==', 'expired')
            .orderBy('membership_started_at', 'desc')
            .limit(limit);

    const snap = await query.get();

    const totalRecords = await db
      .collection('users')
      .where('membership_status', '==', 'expired')
      .count()
      .get();

    return {
      pageRecords: snap.size,
      totalPages: Math.ceil(totalRecords.data().count / limit),
      totalRecords: totalRecords.data().count,
      data: snap.docs.map((r) => ({
        id: r.id,
        name: r.get('name'),
        email: r.get('email'),
        membership_started_at: dateToString(r.get('membership_started_at')),
        membership_expired_at: dateToString(r.get('membership_expired_at')),
        membership: r.get('membership'),
        sponsor_id: r.get('sponsor_id'),
        balance: r.get('balance'),
      })),
    };
  }

  async profitsHistory(page: number, limit: number) {
    const query =
      page > 1
        ? db
            .collectionGroup('profits_details')
            .orderBy('created_at', 'desc')
            .offset((page - 1) * limit)
            .limit(limit)
        : db
            .collectionGroup('profits_details')
            .orderBy('created_at', 'desc')
            .limit(limit);

    const snap = await query.get();

    const totalRecords = await db
      .collectionGroup('profits_details')
      .count()
      .get();

    return {
      pageRecords: snap.size,
      totalPages: Math.ceil(totalRecords.data().count / limit),
      totalRecords: totalRecords.data().count,
      data: snap.docs.map((r) => {
        return {
          id: r.id,
          amount: r.get('amount'),
          created_at: dateToString(r.get('created_at')),
          description: r.get('description'),
          type: r.get('type'),
          register_user_name: r.get('user_name'),
          benefited_user_name: r.get('benefited_user_name'),
          concept: r.get('concept') || '',
        };
      }),
    };
  }

  async usersInterest(page: number, limit: number, compound?: boolean) {
    let query;

    if (compound == undefined) {
      query =
        page > 1
          ? db
              .collection('users')
              .where('deposits', '>', 0)
              .orderBy('deposits', 'desc')
              .offset((page - 1) * limit)
              .limit(limit)
          : db
              .collection('users')
              .where('deposits', '>', 0)
              .orderBy('deposits', 'desc')
              .limit(limit);
    } else {
      query =
        page > 1
          ? db
              .collection('users')
              .where('deposits', '>', 0)
              .where('compound_interest', '==', compound)
              .orderBy('deposits', 'desc')
              .offset((page - 1) * limit)
              .limit(limit)
          : db
              .collection('users')
              .where('deposits', '>', 0)
              .where('compound_interest', '==', compound)
              .orderBy('deposits', 'desc')
              .limit(limit);
    }

    const snap = await query.get();

    const totalRecords = await (
      compound == undefined
        ? db.collection('users').where('deposits', '>', 0).count()
        : db
            .collection('users')
            .where('deposits', '>', 0)
            .where('compound_interest', '==', compound)
            .count()
    ).get();

    const data = await Promise.all(
      snap.docs.map(async (r) => {
        const deposits = await db
          .collection('users')
          .doc(r.id)
          .collection('deposits')
          .orderBy('next_reward', 'asc')
          .get();
        return {
          id: r.id,
          name: r.get('name'),
          email: r.get('email'),
          deposits: r.get('deposits') || 0,
          paid: 0,
          membership: r.get('membership'),
          is_compound_interest_active: r.get('compound_interest') || false,
          lack_time_to_pay: '',
          profits_interest: r.get('bond_rewards') || 0,
          deposits_limit: r.get('membership_limit_deposits'),
          deposits_cap_current: getCapCurrentDeposits(
            r.get('membership_cap_current'),
            r.get('membership_limit_deposits'),
          ),
          next_reward: dayjs(
            dateToString(deposits.docs[0].get('next_reward')),
          ).day(3),
        };
      }),
    );

    return {
      pageRecords: snap.size,
      totalPages: Math.ceil(totalRecords.data().count / limit),
      totalRecords: totalRecords.data().count,
      data,
    };
  }

  async getCompanyBalance() {
    // entradas de dinero
    const coinpayments = await db
      .collection('coinpayments')
      .where('payment_status', '==', 'paid')
      .get();
    const income = coinpayments.docs.reduce(
      (a, b) => a + Number(b.get('amount')),
      0,
    );

    // comisiones pendientes
    // dinero que hay en los balances
    const users_comissions = await db
      .collection('users')
      .where('balance', '>', 0)
      .get();
    const pending_pay = users_comissions.docs.reduce(
      (a, b) => a + Number(b.get('balance')),
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
    const query =
      page > 1
        ? db
            .collection('coinpayments')
            .orderBy('created_at', 'desc')
            .offset((page - 1) * limit)
            .limit(limit)
        : db
            .collection('coinpayments')
            .orderBy('created_at', 'desc')
            .limit(limit);

    const snap = await query.get();

    const totalRecords = await db
      .collection('coinpayments')
      .orderBy('created_at', 'desc')
      .count()
      .get();

    return {
      pageRecords: snap.size,
      totalPages: Math.ceil(totalRecords.data().count / limit),
      totalRecords: totalRecords.data().count,
      data: await Promise.all(
        snap.docs.map(async (r) => {
          const user = await db.collection('users').doc(r.get('user_id')).get();
          return {
            id: r.id,
            ...r.data(),
            user_email: user.get('email'),
            user_name: user.get('name'),
          };
        }),
      ),
    };
  }

  async disruptiveTransactions(page: number, limit: number) {
    const query =
      page > 1
        ? db
            .collection('disruptive-academy')
            .orderBy('created_at', 'desc')
            .offset((page - 1) * limit)
            .limit(limit)
        : db
            .collection('disruptive-academy')
            .orderBy('created_at', 'desc')
            .limit(limit);

    const snap = await query.get();

    const totalRecords = await db
      .collection('disruptive-academy')
      .count()
      .get();

    return {
      pageRecords: snap.size,
      totalPages: Math.ceil(totalRecords.data().count / limit),
      totalRecords: totalRecords.data().count,
      data: await Promise.all(
        snap.docs.map(async (r) => {
          const user = await db.collection('users').doc(r.get('user_id')).get();
          return {
            id: r.id,
            ...r.data(),
            user_email: user.get('email'),
            user_name: user.get('name'),
          };
        }),
      ),
    };
  }

  async usersranks(page: number, limit: number) {
    const response = await this.activeUsers(page, limit);

    for (const user of response.data) {
      user.rank = await this.ranksService.getRankUser(user.id);
    }

    return response;
  }

  async stats() {
    const users = await db.collection('users').get();

    const balance = users.docs.reduce((a, b) => a + (b.get('balance') || 0), 0);
    const memberbers_active = users.docs.reduce(
      (a, b) => a + (b.get('membership_status') == 'paid' ? 1 : 0),
      0,
    );
    const memberbers_inactive = users.docs.reduce(
      (a, b) => a + (b.get('membership_status') != 'paid' ? 1 : 0),
      0,
    );
    const debt_interest = users.docs.reduce(
      (a, user) =>
        a +
        (user.get('deposits') > 0
          ? user.get('deposit_cap_limit') -
            getCapCurrentDeposits(
              user.get('membership_cap_current'),
              user.get('deposit_cap_limit'),
            )
          : 0),
      0,
    );
    const profits = users.docs.reduce((a, b) => a + b.get('profits'), 0);

    const pending_withdraw = await db
      .collection('requests-withdraw')
      .where('status', '==', 'pending')
      .get();

    const income = await db.collection('reports').doc('income').get();

    return {
      balance,
      memberbers_active,
      memberbers_inactive,
      debt_interest,
      profits,
      pending_withdraw: pending_withdraw.size,
      income: income.get('total'),
    };
  }

  async monthIncomeReport() {
    const coinpayments = await db
      .collection('coinpayments')
      .where('payment_status', '==', 'paid')
      .get();

    const chartDataDeposits = new Array(12).fill(null);
    const chartDataMemberships = new Array(12).fill(null);

    for (const d of coinpayments.docs) {
      const date = dayjs(d.get('created_at').seconds * 1000);

      if (d.get('type') == 'deposit') {
        if (!chartDataDeposits[date.get('month')])
          chartDataDeposits[date.get('month')] = 0;
        chartDataDeposits[date.get('month')] += Number(d.get('amount'));
      }

      if (d.get('type') == 'membership') {
        if (!chartDataMemberships[date.get('month')])
          chartDataMemberships[date.get('month')] = 0;
        chartDataMemberships[date.get('month')] += Number(d.get('amount'));
      }
    }

    return {
      deposits: chartDataDeposits,
      memberships: chartDataMemberships,
    };
  }

  async getListRanksMonths() {
    const snap = await db.collection('ranks').get();
    return snap.docs.map((r) => ({
      yearmonth: r.id,
    }));
  }

  async rankPromotion(year: number, month: number) {
    const snap = await db
      .collection('ranks')
      .doc(`${year}-${month}`)
      .collection('users')
      .get();

    return Promise.all(
      snap.docs.map(async (r) => {
        const user = await db.collection('users').doc(r.id).get();
        return {
          name: user.get('name'),
          email: user.get('email'),
          rank: r.get('current_rank'),
          is_promotion: r.get('new_rank') || false,
          past_rank: r.get('past_max_rank'),
        };
      }),
    );
  }

  async getLastUsers() {
    const users = await db
      .collection('users')
      .orderBy('membership_started_at', 'desc')
      .limit(6)
      .get();

    return users.docs.map((r) => ({
      id: r.id,
      name: r.get('name'),
      started_at: dateToString(r.get('membership_started_at')),
      membership: r.get('membership'),
    }));
  }

  async getLastInvoices() {
    const users = await db
      .collection('coinpayments')
      .where('payment_status', '==', 'paid')
      .orderBy('created_at', 'desc')
      .limit(6)
      .get();

    return users.docs.map((r) => ({
      id: r.id,
      user_name: r.get('user_name'),
      user_email: r.get('user_email'),
      amount: Number(r.get('total')),
      type: r.get('type'),
      created_at: dateToString(r.get('created_at')),
    }));
  }

  async usersBalances() {
    const users = await db
      .collection('users')
      .where('balance', '>', 0)
      .orderBy('balance', 'desc')
      .get();

    return users.docs.map((r) => ({
      id: r.id,
      name: r.get('name'),
      email: r.get('email'),
      balance: r.get('balance'),
      balance_bond_direct: r.get('balance_bond_direct') || 0,
      balance_bond_binary: r.get('balance_bond_binary') || 0,
      balance_bond_rewards: r.get('balance_bond_rewards') || 0,
      balance_bond_rank: r.get('balance_bond_rank') || 0,
    }));
  }

  async weeklyPaymentsById(id: string) {
    const payments = await db
      .collection('admin-pay-rewards')
      .doc(id)
      .collection('users')
      .get();

    return payments.docs.map((r) => ({
      id: r.id,
      ...r.data(),
    }));
  }

  async weeklyPayments() {
    const payments = await db
      .collection('admin-pay-rewards')
      .orderBy('created_at', 'desc')
      .get();
    return payments.docs.map((r) => ({
      id: r.id,
      ...r.data(),
      created_at: dateToString(r.get('created_at')),
    }));
  }

  async calendarPayments() {
    const FUTURE_WEEKS = 4 * 3; // 4 meses al futuro
    const data = [];

    for (let i = 1; i <= FUTURE_WEEKS; i++) {
      const date = dayjs().add(i, 'weeks');
      const year = date.year();
      const week = date.isoWeek();

      const { users_to_pay_with, users_to_pay_without } =
        await this.getWeekToPay(year, week);

      const total_with = users_to_pay_with.docs.reduce(
        (a, b) => a + b.get('amount') - (b.get('accelerated_amount') || 0),
        0,
      );

      const total_without = users_to_pay_without.docs.reduce(
        (a, b) => a + b.get('deposit_amount') * 0.02,
        0,
      );

      data.push({
        year,
        week,
        total_with,
        total_without,
        total: total_with + total_without,
        start_week: date.startOf('week').toISOString(),
        end_week: date.endOf('week').toISOString(),
      });
    }

    return data;
  }

  async getWeekToPay(year: number, week: number) {
    const date = dayjs().set('year', year).week(week);

    const users_to_pay_without = await db
      .collectionGroup('rewards')
      .where('year', '==', year)
      .where('year_week', '==', week)
      .where('compound_interest', '==', false)
      .get();

    const users_to_pay_with = await db
      .collectionGroup('deposits')
      .where('finish_at', '>=', date.startOf('week').toDate())
      .where('finish_at', '<=', date.endOf('week').toDate())
      .where('compound_interest', '==', true)
      .get();

    return {
      users_to_pay_with,
      users_to_pay_without,
    };
  }
}
