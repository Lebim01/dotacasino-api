import { HttpException, Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import { firestore } from 'firebase-admin';
import { AuthService } from '../auth/auth.service';
import { BondsService } from '../bonds/bonds.service';
import { CoinpaymentsService } from '../coinpayments/coinpayments.service';
import { ADMIN_USER } from '../constants';
import { db } from '../firebase/admin';
import { dateToString } from '../utils/firebase';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly bondsService: BondsService,
    private readonly coinPaymentsService: CoinpaymentsService,
    private readonly authAcademyService: AuthAcademyService,
  ) {}

  async activationsWithVolumen() {
    const snap = await db
      .collection('admin-activations-with-volume')
      .orderBy('created_at', 'desc')
      .get();

    return snap.docs.map((r) => ({ id: r.id, ...r.data() }));
  }

  async getEstimatedPayRewards() {
    const year = dayjs().year();
    const year_week = dayjs().isoWeek();

    const history = await db
      .collection('admin-pay-rewards')
      .doc(`${year}-${year_week}`)
      .get();

    if (history.exists) {
      return {
        status: 'paid',
        percent: history.get('percent'),
        total: history.get('total'),
      };
    }

    const users_to_pay = await db
      .collectionGroup('rewards')
      .where('year', '==', year)
      .where('year_week', '==', year_week)
      .where('compound_interest', '==', false)
      .get();

    return {
      status: 'pending',
      percent: null,
      total:
        users_to_pay.docs.reduce((a, b) => a + b.get('deposit_amount'), 0) *
        0.02,
    };
  }

  async getNextEstimatedPayRewards() {
    const data = [];

    for (let i = 1; i <= 4; i++) {
      const date = dayjs().add(i, 'week');
      const year = date.year();
      const year_week = date.isoWeek();
      const users_to_pay = await db
        .collectionGroup('rewards')
        .where('year', '==', year)
        .where('year_week', '==', year_week)
        .where('compound_interest', '==', false)
        .get();
      data.push({
        year,
        week: year_week,
        start_at: date.startOf('week').toISOString(),
        ends_at: date.endOf('week').toISOString(),
        volumen: users_to_pay.docs.reduce(
          (a, b) => a + b.get('deposit_amount'),
          0,
        ),
        total:
          users_to_pay.docs.reduce((a, b) => a + b.get('deposit_amount'), 0) *
          0.02,
      });
    }

    return data;
  }

  async getPayRewards() {
    const year = dayjs().year();
    const year_week = dayjs().isoWeek();
    const users_to_pay = await db
      .collectionGroup('rewards')
      .where('year', '==', year)
      .where('year_week', '==', year_week)
      .where('compound_interest', '==', false)
      .get();

    return Promise.all(
      users_to_pay.docs.map(async (r) => {
        const deposit = await r.ref.parent.parent!.get();
        const user = await deposit.ref.parent.parent!.get();
        return {
          deposits: deposit.get('amount'),
          name: user.get('name'),
          email: user.get('email'),
        };
      }),
    );
  }

  async payReward(percent: number) {
    if (percent >= 1) return;

    const year = dayjs().year();
    const year_week = dayjs().isoWeek();

    const users_to_pay = await db
      .collectionGroup('rewards')
      .where('year', '==', year)
      .where('year_week', '==', year_week)
      .where('compound_interest', '==', false)
      .get();

    const batch = db.batch();

    const rewardRef = db
      .collection('admin-pay-rewards')
      .doc(`${year}-${year_week}`);

    let total = 0;

    for (const d of users_to_pay.docs) {
      const deposit = await d.ref.parent.parent!.get();
      const user_id = deposit.ref.parent.parent!.id;
      const user = await deposit.ref.parent.parent!.get();
      const amount = deposit.get('amount') * percent;
      total += amount;
      batch.update(d.ref, {
        status: 'paid',
        amount,
        compound_interest: false,
      });
      batch.update(deposit.ref, {
        rewards_balance: firestore.FieldValue.increment(amount),
      });
      batch.create(rewardRef.collection('users').doc(), {
        deposit_id: deposit.id,
        user_id,
        user_name: user.get('name'),
        user_email: user.get('email'),
        amount,
      });

      await this.bondsService.execReward(user_id, amount, {
        percent,
        deposit_id: deposit.id,
        reward_id: d.id,
      });
    }

    batch.set(rewardRef, {
      created_at: new Date(),
      percent,
      total,
      status: 'paid',
      year,
      week: year_week,
    });

    await batch.commit();
  }

  async coinpaymentsProcessTransaction(txn_id: string) {
    const transaction = await db.collection('coinpayments').doc(txn_id).get();

    if (!transaction.exists) throw new Error('not found');

    await db.collection('admin-process-transaction').add({
      txn_id,
      created_at: new Date(),
      volumen: true,
    });

    try {
      await transaction.ref.update({
        payment_status: 'admin-activation',
        volumen: true,
      });

      /**
       * Get document
       */
      if (transaction.get('type') == 'membership') {
        // activar membresia
        await this.coinPaymentsService.sendActiveMembership(txn_id);
      } else if (transaction.get('type') == 'deposit') {
        // sumar deposito
        await this.coinPaymentsService.sendActiveDeposit(txn_id);
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async coinpaymentsProcessTransactionWithoutVolumen(txn_id: string) {
    const transaction = await db.collection('coinpayments').doc(txn_id).get();

    if (!transaction.exists) throw new Error('not found');

    await db.collection('admin-process-transaction').add({
      txn_id,
      created_at: new Date(),
      volumen: false,
    });

    try {
      await transaction.ref.update({
        payment_status: 'admin-activation',
        volumen: false,
      });

      /**
       * Get document
       */
      if (transaction.get('type') == 'membership') {
        // activar membresia
        await this.coinPaymentsService.sendActiveMembership(txn_id);
      } else if (transaction.get('type') == 'deposit') {
        // sumar deposito
        await this.coinPaymentsService.sendActiveDeposit(txn_id);
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async disruptiveProcessTransaction(txn_id: string) {
    const transaction = await db.collection('disruptive').doc(txn_id).get();

    if (!transaction.exists) throw new Error('not found');

    await db.collection('admin-process-transaction').add({
      txn_id,
      created_at: new Date(),
      volumen: true,
    });

    try {
      await transaction.ref.update({
        payment_status: 'admin-activation',
        volumen: true,
      });

      /**
       * Get document
       */
      if (transaction.get('type') == 'membership') {
        // activar membresia
        await this.coinPaymentsService.sendActiveMembership(txn_id);
      } else if (transaction.get('type') == 'deposit') {
        // sumar deposito
        await this.coinPaymentsService.sendActiveDeposit(txn_id);
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async disruptiveProcessTransactionWithoutVolumen(txn_id: string) {
    const transaction = await db.collection('disruptive-academy').doc(txn_id).get();

    if (!transaction.exists) throw new Error('not found');

    await db.collection('admin-process-transaction').add({
      txn_id,
      created_at: new Date(),
      volumen: false,
    });

    try {
      await transaction.ref.update({
        payment_status: 'admin-activation',
        volumen: false,
      });

      /**
       * Get document
       */
      if (transaction.get('type') == 'membership') {
        // activar membresia
        await this.coinPaymentsService.sendActiveMembership(txn_id);
      } else if (transaction.get('type') == 'deposit') {
        // sumar deposito
        await this.coinPaymentsService.sendActiveDeposit(txn_id);
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async withdraws() {
    const pending_withdraw = await db
      .collection('requests-withdraw')
      .where('status', '==', 'pending')
      .get();

    return Promise.all(
      pending_withdraw.docs.map(async (r) => {
        const user = await db.collection('users').doc(r.get('id_user')).get();
        return {
          id: r.id,
          id_user: r.get('id_user'),
          name: user.get('name'),
          email: user.get('email'),
          amount: r.get('amount'),
          created_at: dateToString(r.get('created_at')),
          wallet_usdt: r.get('wallet_usdt'),
          type: r.get('type'),
          deposit_id: r.get('deposit_id'),
        };
      }),
    );
  }

  async historyAdminActivationWithVolumen() {
    const snap = await db
      .collection('admin-activations-with-volume')
      .orderBy('created_at', 'desc')
      .get();

    return snap.docs.map((r) => ({
      id: r.id,
      ...r.data(),
      created_at: dateToString(r.get('created_at')),
    }));
  }

  async historyAdminActivationWithoutVolumen() {
    const snap = await db
      .collection('admin-activations')
      .orderBy('created_at', 'desc')
      .get();

    return snap.docs.map((r) => ({
      id: r.id,
      ...r.data(),
      created_at: dateToString(r.get('created_at')),
    }));
  }

  async addPoints(id_user: string, side: 'left' | 'right', points: number) {
    const batch = db.batch();

    const user = await db.collection('users').doc(id_user).get();

    batch.create(db.collection('history-admin-add-points').doc(), {
      created_at: new Date(),
      points,
      side,
      id_user,
      name: user.get('name'),
    });

    batch.create(
      db.collection('users').doc(id_user).collection('points').doc(),
      {
        created_at: new Date(),
        points,
        side,
        added_by_admin: true,
      },
    );

    batch.create(
      db.collection('users').doc(id_user).collection(`${side}-points`).doc(),
      {
        user_id: ADMIN_USER,
        email: user.get('email'),
        starts_at: new Date(),
        points,
        name: 'ADMIN',
        expires_at: dayjs().add(3, 'years').toDate(),
        added_by_admin: true,
      },
    );

    await batch.commit();
  }

  async getHistoryAdminAddPoints() {
    const snap = await db.collection('history-admin-add-points').get();

    return snap.docs.map((r) => ({
      id: r.id,
      ...r.data(),
    }));
  }

  async blockuser(email: string) {
    const snap = await db.collection('users').where('email', '==', email).get();

    if (snap.empty) {
      throw new HttpException('User not exists', 401);
    }

    await snap.docs[0].ref.update({
      status: 'banned',
      is_banned: true,
    });
  }

  async denyWithdraw(id_withdraw: string) {
    const withdraw = await db
      .collection('requests-withdraw')
      .doc(id_withdraw)
      .get();
    const user = await db
      .collection('users')
      .doc(withdraw.get('id_user'))
      .get();

    const withdraw_amount = withdraw.get('amount');

    const batch = db.batch();

    batch.update(withdraw.ref, {
      status: 'deny',
    });

    if (withdraw.get('type') == 'deposit') {
      const deposit_ref = user.ref
        .collection('deposits')
        .doc(withdraw.get('deposit_id'));
      batch.update(deposit_ref, {
        rewards_pending: firestore.FieldValue.increment(withdraw_amount * -1),
      });
    } else {
      batch.update(user.ref, {
        [`pending_bond_${withdraw.get('type')}`]:
          firestore.FieldValue.increment(withdraw_amount * -1),
      });
    }

    await batch.commit();
  }

  async paidWithdraw(id_withdraw: string) {
    const withdraw = await db
      .collection('requests-withdraw')
      .doc(id_withdraw)
      .get();
    const user = await db
      .collection('users')
      .doc(withdraw.get('id_user'))
      .get();

    const withdraw_amount = withdraw.get('amount');

    const batch = db.batch();

    batch.update(withdraw.ref, {
      status: 'paid',
    });

    if (withdraw.get('type') == 'deposit') {
      const deposit_ref = user.ref
        .collection('deposits')
        .doc(withdraw.get('deposit_id'));
      batch.update(deposit_ref, {
        rewards_pending: firestore.FieldValue.increment(withdraw_amount * -1),
        rewards_balance: firestore.FieldValue.increment(withdraw_amount * -1),
      });
    } else {
      batch.update(user.ref, {
        [`pending_bond_${withdraw.get('type')}`]:
          firestore.FieldValue.increment(withdraw_amount * -1),
        [`balance_bond_${withdraw.get('type')}`]:
          firestore.FieldValue.increment(withdraw_amount * -1),
      });
    }

    await batch.commit();
  }

  async coinpaymentsTransactions(page: number, limit: number) {
    const query =
      page > 1
        ? db
            .collection('coinpayments')
            .where('payment_status', '==', 'paid')
            .orderBy('created_at', 'desc')
            .offset((page - 1) * limit)
            .limit(limit)
        : db
            .collection('coinpayments')
            .where('payment_status', '==', 'paid')
            .orderBy('created_at', 'desc')
            .limit(limit);

    const snap = await query.get();

    const totalRecords = await db
      .collection('coinpayments')
      .where('payment_status', '==', 'paid')
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
            created_at: dateToString(r.get('created_at')),
            user_email: user.get('email'),
            user_name: user.get('name'),
          };
        }),
      ),
    };
  }

  async changeEmailUser(old_email: string, new_email: string) {
    const email_exists = await db
      .collection('users')
      .where('email', '==', new_email)
      .get();

    if (!email_exists.empty) {
      throw new HttpException('email exists', 401);
    }

    const user = await db
      .collection('users')
      .where('email', '==', old_email)
      .get();

    if (user.empty) {
      throw new HttpException('user not exists', 401);
    }

    await db.collection('admin-change-email').add({
      created_at: new Date(),
      old_email,
      new_email,
      user_id: user.docs[0].id,
    });

    await user.docs[0].ref.update({
      email: new_email,
    });
  }

  async changePasswordUser(email: string, password: string) {
    const user = await db.collection('users').where('email', '==', email).get();

    if (user.empty) {
      throw new HttpException('user not exists', 401);
    }

    await db.collection('admin-change-password').add({
      created_at: new Date(),
      user_id: user.docs[0].id,
    });

    await user.docs[0].ref.update({
      password: await this.authAcademyService.getPassword(password),
    });
  }
}
