import { HttpException, Injectable } from '@nestjs/common';
import { Concept, UserDTO } from './dto/users.dto';
import { hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { MailerService } from '../mailer/mailer.service';
import { db } from '../firebase/admin';
import { getDirectTree as _getDirectTree, parseUserData } from './utils';
import { ChangeProfileDTO } from './dto/recover-pass.dto';
import { currentMultiplier as _currentMultiplier } from '../utils/deposits';
import { MEMBERSHIP_PRICES } from '../constants';
import { firestore } from 'firebase-admin';
import { dateToString } from '../utils/firebase';
import { AuthService } from '../auth/auth.service';
import { DisruptiveService } from '../disruptive/disruptive.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly authService: AuthService,
    private readonly disruptiveService: DisruptiveService,
  ) {}

  async getUsers(page: number, limit: number) {
    const query =
      page > 1
        ? db
            .collection('users')
            .orderBy('created_at')
            .offset(page * limit)
            .limit(limit)
        : db.collection('users').orderBy('created_at').limit(limit);

    const snap = await query.get();

    const totalRecords = await db.collection('users').count().get();

    return {
      totalRecords: totalRecords.data().count,
      data: snap.docs.map((r) => ({
        id: r.id,
        name: r.get('name'),
        email: r.get('email'),
        membership_status: r.get('membership_status'),
        whatsapp: r.get('whatsapp'),
        country: r.get('country'),
      })),
    };
  }

  async formatAdminUser(user: UserDTO) {
    const { password: plainPass } = user;
    const plainToHash = await hash(plainPass, 10);
    const id = randomUUID();

    return {
      ...user,
      email: user.email.toLowerCase(),
      id,
      password: plainToHash,
    };
  }

  async isExistingUser(email: string) {
    const user = await this.authService.getUserByEmail(email);
    return !!user;
  }

  async getUserById(id: string, complete = false) {
    const user = await db.collection('users').doc(id).get();

    if (!user.exists) throw new HttpException('USER_NOT_FOUND', 404);

    return parseUserData(user, complete);
  }

  async changePassword(email: string, newPassword: string) {
    const hashedPassword = await hash(newPassword, 10);

    const user = await this.authService.getUserByEmail(email);

    if (!user) throw new HttpException('USER_NOT_FOUND', 404);

    await db.collection('users').doc(user.uid).update({
      password: hashedPassword,
    });

    return { success: true, message: 'PASSWORD_CHANGED_SUCCESSFULLY' };
  }

  async changePasswordById(user_id: string, newPassword: string) {
    const hashedPassword = await hash(newPassword, 10);
    const user = await db.collection('users').doc(user_id).get();

    if (!user.exists) throw new HttpException('USER_NOT_FOUND', 404);

    await user.ref.update({
      password: hashedPassword,
    });

    return { success: true, message: 'PASSWORD_CHANGED_SUCCESSFULLY' };
  }

  async sendRecoverPassEmail(email: string, otp: string) {
    const isSended = await this.mailerService.sendRecoverPassEmail(
      email.toLowerCase(),
      otp,
    );
    if (!isSended) throw new HttpException('MAILER_ERROR', 500);
    return isSended;
  }

  async sendOTP(email: string, otp: string) {
    const isSended = await this.mailerService.sendOTP(email.toLowerCase(), otp);
    if (!isSended) throw new HttpException('MAILER_ERROR', 500);
    return isSended;
  }

  async verifyOTP(id_user: string, otp_code: string) {
    const otp_doc = await db.collection('otp').doc(id_user).get();

    if (otp_doc.get('otp') == otp_code) {
      return true;
    }

    return false;
  }

  async updateUserIMG(userID: string, imgURL: string) {
    const user = await db.collection('users').doc(userID).get();

    if (!user.exists) throw new HttpException('USER_NOT_FOUND', 404);

    await user.ref.update({
      avatar: imgURL,
    });

    return { success: true, message: 'IMG_UPDATED_SUCCESSFULLY', imgURL };
  }

  async isActiveUser(id_user: string) {
    const user = await db.collection('users').doc(id_user).get();
    return this.isActiveUserByDoc(user);
  }

  isActiveUserByDoc(
    user_doc: firestore.DocumentSnapshot<
      firestore.DocumentData,
      firestore.DocumentData
    >,
  ) {
    const is_admin = Boolean(user_doc.get('is_admin'));
    return is_admin || user_doc.get('membership_status') != 'expired';
  }

  async getDirectTree(id_user: string) {
    return _getDirectTree(id_user, 5);
  }

  async updateUserProfile(id_user: string, body: ChangeProfileDTO) {
    await db
      .collection('users')
      .doc(id_user)
      .update(body as any);
  }

  async getQRMembership(id_user: string) {
    const user = await db.collection('users').doc(id_user).get();
    const txn_id = user.get('membership_link_disruptive');

    if (txn_id) {
      const txn = await db.collection('disruptive-academy').doc(txn_id).get();
      return {
        address: txn.get('address'),
        amount: txn.get('amount'),
        membership_type: txn.get('membership_type'),
        status: txn.get('payment_status'),
        expires_at: txn.get('expires_at'),
        qrcode_url: txn.get('qrcode_url'),
        status_text: null,
      };
    }

    return null;
  }

  async createMembershipQR(id_user: string, membership_type: Memberships) {
    const amount = MEMBERSHIP_PRICES[membership_type];
    if (!amount) throw new HttpException('INVALID_MEMBERSHIP_TYPE', 403);

    const user = await db.collection('users').doc(id_user).get();

    if (user.get('membership')) {
      // UPGRADE
      const diff =
        MEMBERSHIP_PRICES[membership_type] -
        MEMBERSHIP_PRICES[user.get('membership') as Memberships];

      await this.disruptiveService.createMembership(
        id_user,
        membership_type,
        diff,
        true,
      );
    } else {
      await this.disruptiveService.createMembership(
        id_user,
        membership_type,
        amount,
        true,
      );
    }
  }

  async getQRDeposit(id_user: string) {
    const user = await db.collection('users').doc(id_user).get();
    const txn_id = user.get('deposit_link_disruptive');

    if (txn_id) {
      const txn = await db.collection('disruptive-academy').doc(txn_id).get();
      return {
        qr: {
          address: txn.get('address'),
          amount: txn.get('amount'),
          status: txn.get('payment_status'),
          expires_at: txn.get('expires_at'),
          qrcode_url: txn.get('qrcode_url'),
          status_text: null,
        },
      };
    }

    return {
      qr: null,
    };
  }

  async deleteQRDeposit(id_user: string) {
    const property_name = 'deposit_link_disruptive';
    const user = await db.collection('users').doc(id_user).get();
    const txn_id = user.get(property_name);
    await this.cancelTxn(txn_id);
    await user.ref.update({
      [property_name]: null,
    });
  }

  async deleteQRMembership(id_user: string) {
    const property_name = 'membership_link_disruptive';
    const user = await db.collection('users').doc(id_user).get();
    const txn_id = user.get(property_name);
    await this.cancelTxn(txn_id);
    await user.ref.update({
      [property_name]: null,
    });
  }

  async cancelTxn(txn_id: string) {
    await db.collection('disruptive-academy').doc(txn_id).update({
      payment_status: 'cancelled',
      process_status: 'cancelled',
    });
  }

  async referenceLink(user_id: string, position: string) {
    const user = await db.collection('users').doc(user_id).get();
    if (!user.exists) throw new Error('not_fount');
    if (user.get('left') != position && user.get('right') != position)
      throw new Error('error_side');

    return {
      name: user.get('name'),
    };
  }

  async currentDeposit(user_id: string) {
    const user = await db.collection('users').doc(user_id).get();
    return {
      deposits: user.get('deposits'),
      limit: user.get('membership_limit_deposits'),
    };
  }

  async currentMultiplier(user_id: string) {
    return _currentMultiplier(user_id);
  }

  async deposits(user_id: string) {
    const snap = await db
      .collection('users')
      .doc(user_id)
      .collection('deposits')
      .get();

    return snap.docs.map((r) => ({
      id: r.id,
      amount: r.get('amount'),
      created_at: dateToString(r.get('created_at')),
      rewards_balance: r.get('rewards_balance') || 0,
      rewards_pending: r.get('rewards_pending') || 0,
      rewards_generated: r.get('rewards_generated') || 0,
      rewards_withdrawed: r.get('rewards_withdrawed') || 0,
      next_reward: dateToString(r.get('next_reward')),
    }));
  }

  async directs(user_id: string) {
    const regiters = await db
      .collection('users')
      .where('sponsor_id', '==', user_id)
      .where('is_new', '==', true)
      .orderBy('created_at', 'asc')
      .get();

    const subscribeds = await db
      .collection('users')
      .where('sponsor_id', '==', user_id)
      .where('is_new', '==', false)
      .orderBy('created_at', 'asc')
      .get();

    return {
      regiters: regiters.docs.map((r) => parseUserData(r)),
      subscribeds: subscribeds.docs.map((r) => parseUserData(r)),
    };
  }

  async getProfitsStats(user_id: string) {
    const user = await db.collection('users').doc(user_id).get();
    return {
      rank: user.get('bond_rank') || 0,
      direct: user.get('bond_direct') || 0,
      binary: user.get('bond_binary') || 0,
      rewards: user.get('bond_rewards') || 0,
    };
  }

  async getListProfits(user_id: string, page: number, limit: number) {
    const query =
      page > 1
        ? db
            .collection('users')
            .doc(user_id)
            .collection('profits_details')
            .orderBy('created_at')
            .offset(page * limit)
            .limit(limit)
        : db
            .collection('users')
            .doc(user_id)
            .collection('profits_details')
            .orderBy('created_at')
            .limit(limit);

    const snap = await query.get();

    return snap.docs.map((r) => ({
      amount: r.get('amount'),
      created_at: dateToString(r.get('created_at')),
      description: r.get('description'),
      type: r.get('type'),
      user_name: r.get('user_name'),
    }));
  }

  async createwithdraw(
    id_user: string,
    amount: number,
    type: Concept,
    deposit_id?: string,
  ) {
    const user = await db.collection('users').doc(id_user).get();

    if (!user.get('wallet_usdt'))
      throw new HttpException('Wallet usdt required', 401);

    if (['direct', 'binary', 'rank'].includes(type)) {
      const balance = user.get(`balance_${type}`) || 0;
      const pending = user.get(`pending_${type}`) || 0;
      if (balance >= pending + amount) {
        const batch = db.batch();
        batch.create(db.collection('requests-withdraw').doc(), {
          id_user,
          user_name: user.get('name'),
          amount,
          fee: amount * 0.03,
          total: amount - amount * 0.03,
          status: 'pending',
          created_at: new Date(),
          wallet_usdt: user.get('wallet_usdt'),
          type,
        });
        batch.update(user.ref, {
          [`pending_bond_${type}`]: firestore.FieldValue.increment(amount),
        });
        await batch.commit();

        return 'OK';
      }
    }

    if (['deposit'].includes(type)) {
      if (!deposit_id) throw new HttpException('deposit required', 401);
      const deposit = await user.ref
        .collection('deposits')
        .doc(deposit_id)
        .get();

      const balance = deposit.get('rewards_balance');
      const pending = deposit.get('rewards_pending');

      if (balance >= pending + amount) {
        const batch = db.batch();
        batch.create(db.collection('requests-withdraw').doc(), {
          id_user,
          user_name: user.get('name'),
          amount,
          status: 'pending',
          created_at: new Date(),
          wallet_usdt: user.get('wallet_usdt'),
          type,
          deposit_id,
        });
        batch.update(deposit.ref, {
          rewards_pending: firestore.FieldValue.increment(amount),
        });
        await batch.commit();

        return 'OK';
      }
    }

    throw new HttpException('Not Enough Balance', 401);
  }

  async withdrawhistory(id_user: string) {
    const snap = await db
      .collection('requests-withdraw')
      .where('id_user', '==', id_user)
      .orderBy('created_at', 'desc')
      .get();

    return snap.docs.map((r) => ({
      id: r.id,
      ...r.data(),
      created_at: dateToString(r.get('created_at')),
    }));
  }

  async changepassword(
    id_user: string,
    previous_password: string,
    new_password: string,
  ) {
    if (previous_password == new_password) {
      throw new HttpException('Password should be different', 401);
    }

    const user = await db.collection('users').doc(id_user).get();

    const hash = await this.authService.getPassword(previous_password);

    if (hash != user.get('password')) {
      throw new HttpException('Password wrong', 401);
    }

    await user.ref.update({
      password: await this.authService.getPassword(new_password),
    });
  }

  async getNft(id_user: string) {
    const user = await db.collection('users').doc(id_user).get();
    return user.get('nft');
  }

  async reclaimNft(id_user: string) {
    const user = await db.collection('users').doc(id_user).get();
    await db
      .collection('users')
      .doc(id_user)
      .update({
        nft: {
          ...user.get('nft'),
          status: 'reclaim',
        },
      });
  }
}
