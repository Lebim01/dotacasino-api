/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import { db as admin, db } from '../firebase/admin';
import { firestore } from 'firebase-admin';
import { BinaryService } from '../binary/binary.service';
import { PayloadAssignBinaryPosition } from './types';
import { google } from '@google-cloud/tasks/build/protos/protos';
import * as googleTaskService from '../googletask/utils';
import { BondsService } from '../bonds/bonds.service';
import { getLimitDeposit, getLimitMembership } from '../utils/deposits';
import { MEMBERSHIP_PRICES, memberships_object } from '../constants';
import { Memberships } from '../types';
import { PrismaService } from 'libs/db/src/prisma.service';
import Decimal from 'decimal.js';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly binaryService: BinaryService,
    private readonly bondService: BondsService,
    private readonly prisma: PrismaService,
  ) {}

  async isActiveUser(id_user: string) {
    const user = await admin.collection('users').doc(id_user).get();

    const is_admin = Boolean(user.get('is_admin'));
    return is_admin || user.get('membership_status') != 'expired';
  }

  calculateExpirationDate(): Date {
    return dayjs().add(10, 'years').toDate();
  }

  async assingMembership(
    id_user: string,
    type: Memberships,
    txn_id: string | null,
    volumen: boolean,
    is_new: boolean,
  ) {
    const expiresAt = is_new
      ? dayjs().add(2, 'days').toDate()
      : this.calculateExpirationDate();
    const user = await db.collection('users').doc(id_user).get();
    const is_upgrade = user.get('membership_status') == 'paid';

    await admin
      .collection('users')
      .doc(id_user)
      .update({
        membership: type,
        membership_started_at: new Date(),
        membership_status: 'paid',
        membership_expires_at: expiresAt,
        membership_limit_deposits: getLimitDeposit(type),
        membership_cap_limit: getLimitMembership(type),
        membership_cap_current: 0,
        membership_link_coinpayments: null,
        membership_link_disruptive: null,
        is_new: false,
        activation: volumen ? 'with-volumen' : 'without-volumen',
      });

    await admin
      .collection('users')
      .doc(id_user)
      .collection('cycles')
      .add({
        type,
        start_at: new Date(),
        ends_at: expiresAt,
        txn_id: txn_id || null,
        is_upgrade,
        volumen,
      });
  }

  async isNewMember(id_user: string) {
    const userRef = await admin.collection('users').doc(id_user).get();
    const isNew = Boolean(userRef.get('is_new')) ?? false;
    return isNew;
  }

  async onPaymentMembership(
    id_user: string,
    type: Memberships,
    txn_id: string | null,
    volumen: boolean,
  ) {
    const userDocRef = admin.collection('users').doc(id_user);
    const data = await userDocRef.get();
    const isNew = Boolean(data.get('is_new')) ?? false;

    let is_upgrade = false;
    let membership_price = MEMBERSHIP_PRICES[type];

    if (txn_id) {
      const transaction = await db
        .collection('disruptive-academy')
        .doc(txn_id)
        .get();
      is_upgrade = transaction.get('is_upgrade') || false;
      if (is_upgrade) {
        membership_price = transaction.get('total');
      }
    }

    /**
     * Se activa la membresia
     */
    await this.assingMembership(id_user, type, txn_id, true, false);

    /*if (isNew) {
      try {
        await this.emailService.sendEmailNewUser(id_user);
      } catch (err) {
        console.error('No se pudo enviar el correo de bienvenida');
      }
    }*/

    if (isNew) {
      await userDocRef.update({
        first_cycle_started_at: new Date(),
      });
    }

    const sponsorRef = await admin
      .collection('users')
      .doc(data.get('sponsor_id'))
      .get();

    /**
     * Binario activo sponsor
     */
    if (!sponsorRef.get('is_binary_active')) {
      const is_active = await this.isBinaryActive(data.get('sponsor_id'));

      await sponsorRef.ref.update({
        is_binary_active: is_active,
      });
    }

    /**
     * aumentar contador de gente directa
     */
    if (isNew) {
      await sponsorRef.ref.update({
        count_direct_people: firestore.FieldValue.increment(1),
      });
    }

    if (volumen) {
      await this.bondService.execUserDirectBond(id_user, membership_price, {
        concept:
          `Membresia ${memberships_object[type].display} ` +
          (is_upgrade ? ' (Upgrade)' : ''),
      });
    }

    if (volumen) {
      await this.prisma.ledgerEntry.create({
        data: {
          amount: new Decimal(membership_price),
          kind: 'membership',
          meta: {
            txn_id,
            is_upgrade,
            type,
          },
          idempotencyKey: txn_id,
          balanceAfter: null,
          walletId: '',
        },
      });
    }

    await this.addQueueBinaryPosition({
      id_user,
      txn_id,
      points: volumen ? membership_price : 0,
    });
  }

  async isBinaryActive(user_id: string) {
    const left_direct = await db
      .collection('users')
      .where('sponsor_id', '==', user_id)
      .where('position', '==', 'left')
      .where('is_new', '==', false)
      .limit(1)
      .get();

    const right_direct = await db
      .collection('users')
      .where('sponsor_id', '==', user_id)
      .where('position', '==', 'right')
      .where('is_new', '==', false)
      .limit(1)
      .get();

    return !left_direct.empty && !right_direct.empty;
  }

  async addQueueBinaryPosition(body: PayloadAssignBinaryPosition) {
    type Method = 'POST';
    const task: google.cloud.tasks.v2.ITask = {
      httpRequest: {
        httpMethod: 'POST' as Method,
        url: process.env.API_URL + `/subscriptions/assignBinaryPosition`,
        body: Buffer.from(JSON.stringify(body)),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    };

    await googleTaskService.addToQueue(
      task,
      googleTaskService.getPathQueue('assign-binary-position'),
    );
  }

  async assignBinaryPosition(
    payload: PayloadAssignBinaryPosition,
    volumen = true,
  ) {
    console.log('assignBinaryPosition', payload);
    const user = await admin.collection('users').doc(payload.id_user).get();

    /**
     * Asignar posicion en el binario (SOLO USUARIOS NUEVOS)
     */
    const hasBinaryPosition = !!user.get('parent_binary_user_id');
    if (!hasBinaryPosition) {
      const finish_position = user.get('position');

      /**
       * Las dos primeras personas de cada ciclo van al lado del derrame
       */
      const sponsorRef = admin.collection('users').doc(user.get('sponsor_id'));

      let binaryPosition: { parent_id: string | null } = {
        parent_id: null,
      };

      console.log('sponsor_id', user.get('sponsor_id'));

      while (!binaryPosition?.parent_id) {
        binaryPosition = await this.binaryService.calculatePositionOfBinary(
          user.get('sponsor_id'),
          finish_position,
        );
      }

      console.log(binaryPosition);

      /**
       * se setea el valor del usuario padre en el usuario que se registro
       */
      if (!binaryPosition?.parent_id) {
        throw new Error('Error al posicionar el binario');
      }

      await user.ref.update({
        parent_binary_user_id: binaryPosition.parent_id,
      });
      await sponsorRef.update({
        count_direct_people_this_cycle: firestore.FieldValue.increment(1),
      });

      try {
        /**
         * se setea el valor del hijo al usuario ascendente en el binario
         */
        await admin
          .collection('users')
          .doc(binaryPosition.parent_id)
          .update(
            finish_position == 'left'
              ? { left_binary_user_id: user.id }
              : { right_binary_user_id: user.id },
          );
      } catch (err) {
        console.error(err);
      }

      try {
        await this.binaryService.increaseUnderlinePeople(user.id);
      } catch (err) {
        console.log('Error increaseUnderlinePeople');
        console.error(err);
      }
    }

    /**
     * aumenta los puntos del binario hacia arriba
     */
    if (volumen && payload.points > 0) {
      try {
        await this.binaryService.increaseBinaryPoints(
          user.id,
          Number(payload.points),
          'Membresia',
          payload.txn_id,
        );
      } catch (err) {
        console.log('Error increaseBinaryPoints');
        console.error(err);
      }
    }
  }
}
