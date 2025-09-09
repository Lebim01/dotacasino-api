import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import { firestore } from 'firebase-admin';
import { BinaryService } from '../binary/binary.service';
import { BondsService } from '../bonds/bonds.service';
import { db } from '../firebase/admin';
import { currentMultiplier } from '../utils/deposits';
import { dateToString } from '../utils/firebase';

@Injectable()
export class DepositsService {
  constructor(
    private readonly binaryService: BinaryService,
    private readonly bondsService: BondsService,
  ) {}

  async makedeposit(id_user: string, amount: number, txn_id: string) {
    const user_ref = db.collection('users').doc(id_user);
    const user = await user_ref.get();

    const start_to_comission_at = dayjs().day(1).add(2, 'weeks').startOf('day');

    const user_acceleration = await currentMultiplier(user.id);

    const accelerate_deposit =
      user_acceleration.membership.current > 0
        ? user_acceleration.membership.current > amount
          ? amount
          : user_acceleration.membership.current
        : 0;

    const deposit_ref = await user_ref.collection('deposits').add({
      amount,
      created_at: new Date(),
      txn_id,
      start_to_comission_at: start_to_comission_at.toDate(),
      next_reward: start_to_comission_at.toDate(),
      compound_interest: user.get('compound_interest') || false,
      finish_at: user.get('compound_interest')
        ? start_to_comission_at.add(15, 'months').toDate()
        : null,
      rewards_balance: 0,
      rewards_generated: 0,
      rewards_withdrawed: 0,
      rewards_pending: 0,
      accelerated_amount: accelerate_deposit,
    });

    if (user.get('compound_interest')) {
      await this.insertRewardsCompound(id_user, deposit_ref.id, amount);
    } else {
      await this.insertRewards(id_user, deposit_ref.id, amount);
    }

    await this.binaryService.increaseBinaryPoints(
      id_user,
      amount,
      'Inversión',
      txn_id,
    );

    await this.bondsService.execUserDirectBond(id_user, amount, {
      deposit_id: deposit_ref.id,
      concept: 'Añadir valor',
    });

    await user_ref.update({
      deposits: firestore.FieldValue.increment(amount),
      deposit_link_coinpayments: null,
      deposit_link_disruptive: null,
    });
  }

  async activeCompoundInterest(id_user: string) {
    const user = await db.collection('users').doc(id_user).get();

    if (!user.get('compound_interest')) {
      const deposits = await user.ref.collection('deposits').get();
      for (const d of deposits.docs) {
        await this.updateRewardsCompound(id_user, d.id);
      }
      await user.ref.update({
        compound_interest: true,
      });
    }
  }

  async insertRewards(
    user_id: string,
    deposit_id: string,
    deposit_amount: number,
  ) {
    const start_at = dayjs().day(1).add(2, 'week').startOf('day');
    const batch = db.batch();

    for (let i = 1; i <= 15 * 4; i++) {
      const date = dayjs(start_at).add(i, 'week');
      batch.create(
        db
          .collection('users')
          .doc(user_id)
          .collection('deposits')
          .doc(deposit_id)
          .collection('rewards')
          .doc(),
        {
          reclaim_at: date.toDate(),
          status: 'pending',
          year: date.year(),
          year_week: date.isoWeek(),
          week_number_consecutive: i,
          month: Math.floor(i / 4),
          compound_interest: false,
          deposit_amount,
        },
      );
    }
    await batch.commit();
  }

  async updateRewardsCompound(user_id: string, deposit_id: string) {
    const deposit = await db
      .collection('users')
      .doc(user_id)
      .collection('deposits')
      .doc(deposit_id)
      .get();

    const rewards = await deposit.ref
      .collection('rewards')
      .orderBy('reclaim_at', 'asc')
      .get();

    const deposit_amount = deposit.get('amount');

    const start_at =
      deposit.get('rewards_generated') == 0
        ? dayjs(dateToString(rewards.docs[0].get('reclaim_at')))
        : dayjs().day(1).add(3, 'weeks').startOf('day');

    const percent_by_month = 7.6 / 100;

    let amount = deposit_amount;

    for (const r of rewards.docs) {
      if (r.get('status') == 'pending') {
        await r.ref.delete();
      }
    }

    const batch = db.batch();
    for (let i = 1; i <= 15; i++) {
      const commission = Math.floor(amount * percent_by_month * 100) / 100;
      batch.create(
        db
          .collection('users')
          .doc(user_id)
          .collection('deposits')
          .doc(deposit_id)
          .collection('rewards')
          .doc(),
        {
          reclaim_at: dayjs(start_at)
            .add(i - 1, 'month')
            .toDate(),
          status: 'pending',
          amount: commission,
          month_number_consecutive: i,
          compound_interest: true,
        },
      );
      amount += commission;
    }

    batch.update(deposit.ref, {
      compound_interest: true,
      rewards_balance: 0,
      finish_at: start_at.add(15, 'months').toDate(),
    });

    await batch.commit();
  }

  async insertRewardsCompound(
    user_id: string,
    deposit_id: string,
    deposit_amount: number,
  ) {
    const start_at = dayjs().day(1).add(3, 'weeks').startOf('day');
    const batch = db.batch();
    const percent_by_month = 7.6 / 100;

    let amount = deposit_amount;

    for (let i = 1; i <= 15; i++) {
      const commission = amount * percent_by_month;
      batch.create(
        db
          .collection('users')
          .doc(user_id)
          .collection('deposits')
          .doc(deposit_id)
          .collection('rewards')
          .doc(),
        {
          reclaim_at: dayjs(start_at).add(i, 'month').toDate(),
          status: 'pending',
          amount: commission,
          month: i,
          compound_interest: true,
        },
      );
      amount += commission;
    }
    await batch.commit();
  }
}
