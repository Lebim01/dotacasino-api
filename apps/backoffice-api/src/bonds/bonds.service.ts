import { Injectable } from '@nestjs/common';
import { db } from '../firebase/admin';
import { UsersService } from '../users/users.service';
import { firestore } from 'firebase-admin';
import { Bonds, messages, direct_percent, levels_percent } from './bonds';
import { Ranks, ranks_object } from '../ranks/ranks_object';
import { WalletService } from '@domain/wallet/wallet.service';

@Injectable()
export class BondsService {
  constructor(
    private readonly userService: UsersService,
    private readonly walletService: WalletService,
  ) {}

  async addBond(
    user_id: string, // usuario que recibe el bono
    type: Bonds,
    amount: number,
    user_origin_bond: string | null, // usuario que detonó el bono
    add_to_balance = false,
    extras?: Record<string, any>,
  ) {
    const user = await db.collection('users').doc(user_id).get();
    const isActive = this.userService.isActiveUserByDoc(user);

    const _amount = Math.round(amount * 100) / 100;

    if (isActive) {
      const update: any = {};

      if (add_to_balance) {
        update[`balance_${type}`] = firestore.FieldValue.increment(_amount);
        update.membership_cap_current = firestore.FieldValue.increment(_amount);
      }

      await db
        .collection('users')
        .doc(user_id)
        .update({
          [type]: firestore.FieldValue.increment(_amount),
          profits: firestore.FieldValue.increment(_amount),
          ...update,
        });

      await this.addProfitDetail(user_id, type, _amount, user_origin_bond, {
        ...extras,
        benefited_user_name: user.get('name'),
      });

      await this.walletService.credit({
        amount: _amount,
        reason: 'REFERRAL_BONUS',
        userId: user_id,
        meta: {
          ...extras,
          user_origin_bond,
        },
      });
    } else {
      await this.addLostProfit(user_id, type, _amount, user_origin_bond);
    }
  }

  /**
   * solo se reparte este bono a los usuarios activos
   */
  async execUserDirectBond(
    registerUserId: string,
    membership_price: number,
    extras?: Record<string, any>,
  ) {
    console.log('execUserDirectBond', { registerUserId }, { membership_price });
    const user = await db.collection('users').doc(registerUserId).get();

    const sponsor_id = user.get('sponsor_id');
    if (sponsor_id) {
      const sponsorRef = db.collection('users').doc(sponsor_id);
      const sponsor = await sponsorRef.get().then((r) => r.data());

      // primer nivel
      if (sponsor) {
        const isProActive = await this.userService.isActiveUser(sponsor_id);
        const amount =
          Math.round(membership_price * direct_percent * 100) / 100;

        /* Aqui */
        if (isProActive) {
          await this.addBond(
            sponsor_id,
            Bonds.DIRECT,
            amount,
            registerUserId,
            true,
            extras,
          );
        } else {
          await this.addLostProfit(
            sponsorRef.id,
            Bonds.DIRECT,
            amount,
            user.id,
          );
        }
      }
    }
  }

  async execBinary(
    id_user: string,
    amount: number,
    extras?: Record<string, any>,
  ) {
    await this.addBond(id_user, Bonds.BINARY, amount, null, true, extras);
  }

  async execRank(id_user: string, rank: Ranks) {
    await this.addBond(
      id_user,
      Bonds.RANK,
      ranks_object[rank].bonus,
      null,
      true,
      {
        rank,
      },
    );
  }

  async execReward(
    id_user: string,
    amount: number,
    extras?: Record<string, any>,
  ) {
    await this.addBond(id_user, Bonds.REWARD, amount, null, true, extras);
  }

  async addProfitDetail(
    id_user: string,
    type: Bonds,
    amount: number,
    registerUserId: string | null,
    extras?: Record<string, any>,
  ) {
    const profit: any = {
      description: messages[type],
      amount,
      created_at: new Date(),
      type,
    };

    if (registerUserId) {
      const userRef = await db.collection('users').doc(registerUserId).get();
      const user_name = userRef.get('name');
      profit.user_name = user_name;
      profit.id_user = registerUserId;
    }

    await db
      .collection('users')
      .doc(id_user)
      .collection('profits_details')
      .add({ ...profit, ...extras });
  }

  async addLostProfit(
    id_user: string,
    type: Bonds,
    amount: number,
    registerUserId: string | null,
  ) {
    let user_name = '';
    if (registerUserId) {
      const userRef = await db.collection('users').doc(registerUserId).get();
      user_name = userRef.get('name');
    }
    await db.collection('users').doc(id_user).collection('lost_profits').add({
      description: 'Has perdido un bono por membresia inactiva',
      id_user: registerUserId,
      user_name,
      amount,
      created_at: new Date(),
      type,
    });
  }

  async getSponsor(user_id: string) {
    const user = await db.collection('users').doc(user_id).get();
    const sponsor_id = user.get('sponsor_id');
    const sponsor = await db.collection('users').doc(sponsor_id).get();

    return {
      id: sponsor_id,
      ref: sponsor.ref,
      data: sponsor,
    };
  }

  async bondResidual(user_id: string, amount: number) {
    const user = await db.collection('users').doc(user_id).get();

    let currentUser = user.get('sponsor_id');

    for (let i = 0; i < 12; i++) {
      const percent = levels_percent[i];
      const _amount = amount * percent;
      await this.addBond(currentUser, Bonds.RESIDUAL, _amount, null, true, {
        level: i + 1,
        percent,
      });

      const user = await db.collection('users').doc(currentUser).get();
      currentUser = user.get('sponsor_id');
      if (!currentUser) {
        break;
      }
    }
  }
}
