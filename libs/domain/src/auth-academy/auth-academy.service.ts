import { google } from '@google-cloud/tasks/build/protos/protos';
import { Injectable } from '@nestjs/common';
import { USER_ROLES } from 'apps/backoffice-api/src/auth/auth.constants';
import { RegisterAuthDto } from 'apps/backoffice-api/src/auth/dto/register-auth.dto';
import { Bonds } from 'apps/backoffice-api/src/bonds/bonds';
import { db } from 'apps/backoffice-api/src/firebase/admin';
import {
  addToQueue,
  getPathQueue,
} from 'apps/backoffice-api/src/googletask/utils';
import { PayloadAssignBinaryPosition } from 'apps/backoffice-api/src/subscriptions/types';
import { getLimitMembership } from 'apps/backoffice-api/src/utils/deposits';
import { hash } from 'bcryptjs';
import { firestore } from 'firebase-admin';

function makeid(length: number) {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

@Injectable()
export class AuthAcademyService {
  async calculatePositionOfBinary(
    sponsor_id: string,
    position: 'left' | 'right',
  ) {
    let parent_id: null | string = null;

    let next_user_id = sponsor_id;
    while (!parent_id) {
      const sponsorData = await db.collection('users').doc(next_user_id).get();

      if (sponsorData.get(`${position}_binary_user_id`)) {
        next_user_id = sponsorData.get(`${position}_binary_user_id`);
      } else {
        parent_id = next_user_id;
      }
    }

    return {
      parent_id,
    };
  }

  async increaseUnderlinePeople(registerUserId: string) {
    const batch = db.batch();

    let currentUser: string | null = registerUserId;
    let user = await db.collection('users').doc(registerUserId).get();

    do {
      if (!user.get('parent_binary_user_id')) break;

      user = await db
        .collection('users')
        .doc(user.get('parent_binary_user_id'))
        .get();

      if (user.exists) {
        const side =
          user.get('left_binary_user_id') == currentUser ? 'left' : 'right';

        currentUser = user.id;

        batch.update(user.ref, {
          count_underline_people: firestore.FieldValue.increment(1),
        });

        batch.set(
          db
            .collection('users')
            .doc(user.id)
            .collection(`${side}-people`)
            .doc(registerUserId),
          {
            user_id: registerUserId,
            created_at: new Date(),
            membership_status: 'paid',
            rank: 'none',
          },
        );
      } else {
        currentUser = null;
      }
    } while (currentUser);

    // Commit the batch
    await batch.commit();
  }

  async assignBinaryPosition(payload: PayloadAssignBinaryPosition) {
    console.log('assignBinaryPosition', payload);
    const user = await db.collection('users').doc(payload.id_user).get();

    /**
     * Asignar posicion en el binario (SOLO USUARIOS NUEVOS)
     */
    const hasBinaryPosition = !!user.get('parent_binary_user_id');
    if (!hasBinaryPosition) {
      const finish_position = user.get('position') || 'right';

      /**
       * Las dos primeras personas de cada ciclo van al lado del derrame
       */

      let binaryPosition: { parent_id: string | null } = {
        parent_id: null,
      };

      console.log('sponsor_id', user.get('sponsor_id'));

      while (!binaryPosition?.parent_id) {
        binaryPosition = await this.calculatePositionOfBinary(
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
        position: finish_position,
      });

      if (user.get('sponsor_id')) {
        const sponsorRef = db.collection('users').doc(user.get('sponsor_id'));
        await sponsorRef.update({
          count_direct_people_this_cycle: firestore.FieldValue.increment(1),
        });
      }

      try {
        /**
         * se setea el valor del hijo al usuario ascendente en el binario
         */
        await db
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
        await this.increaseUnderlinePeople(user.id);
      } catch (err) {
        console.log('Error increaseUnderlinePeople');
        console.error(err);
      }
    }
  }

  async registerUser(userObject: RegisterAuthDto) {
    let sponsor_name = null;
    let position: null | string = null;

    if (userObject.sponsor_id) {
      const sponsor = await db
        .collection('users')
        .doc(userObject.sponsor_id)
        .get();
      position = userObject.side;
      sponsor_name = sponsor.get('name');
    }

    const formattedUser = await this.formatNewUser(userObject);

    const user = await db
      .collection('users')
      .add({ ...formattedUser, position, sponsor_name });

    await user.update({
      nft: {
        status: 'pending',
        data: {
          name: 'DotaNFT',
          description: 'Este NFT es otorgado por adquirir tu membresia en dota',
          image: 'https://www.dotaacademy.com/public/nft.webp',
          attributes: [
            {
              trait_type: 'identifier',
              value: user.id,
            },
          ],
        },
      },
    });

    await this.addQueueBinaryPosition({
      id_user: user.id,
      points: 0,
      txn_id: null,
    });

    return {
      id: user.id,
      ...formattedUser,
    };
  }

  async addQueueBinaryPosition(body: PayloadAssignBinaryPosition) {
    type Method = 'POST';
    const task: google.cloud.tasks.v2.ITask = {
      httpRequest: {
        httpMethod: 'POST' as Method,
        url: process.env.API_URL + `/auth-binary/assignBinaryPosition`,
        body: Buffer.from(JSON.stringify(body)),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    };

    await addToQueue(task, getPathQueue('assign-binary-position'));
  }

  async getPassword(pass: string) {
    return hash(pass, 10);
  }

  async formatNewUser(userObject: RegisterAuthDto) {
    const { name, email, password: plainPass } = userObject;
    const plainToHash = await this.getPassword(plainPass);
    const roles = [USER_ROLES.USER];

    return {
      name,
      password: plainToHash,
      email: email.toLowerCase(),
      roles,
      sponsor_id: userObject.sponsor_id,
      created_at: new Date(),
      updated_at: new Date(),
      profits: 0,
      balance: 0,
      is_new: true,
      left: userObject.refCodeL || makeid(6),
      right: userObject.refCodeR || makeid(6),
      country: userObject.country,
      whatsapp: userObject.phone,
      username: userObject.username,

      membership: 'free',
      membership_started_at: new Date(),
      membership_expires_at: null,
      membership_cap_limit: getLimitMembership('free'),
      membership_cap_current: 0,

      // CONTADORES
      count_direct_people: 0,
      count_underline_people: 0,
      month_sales_volumen: 0,
      deposits: 0,
      compound_interest: false,

      // BONOS
      [Bonds.DIRECT]: 0,
      [Bonds.BINARY]: 0,
      [Bonds.REWARD]: 0,
      [Bonds.RANK]: 0,
      [`pending_${Bonds.DIRECT}`]: 0,
      [`pending_${Bonds.BINARY}`]: 0,
      [`pending_${Bonds.REWARD}`]: 0,
      [`pending_${Bonds.RANK}`]: 0,

      [`balance_${Bonds.DIRECT}`]: 0,
      [`balance_${Bonds.BINARY}`]: 0,
      [`balance_${Bonds.REWARD}`]: 0,
      [`balance_${Bonds.RANK}`]: 0,

      is_binary_active: false,

      left_points: 0,
      right_points: 0,
    };
  }
}
