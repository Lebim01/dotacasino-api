import { Injectable } from '@nestjs/common';
import { db as admin, db } from '../firebase/admin';
import { firestore } from 'firebase-admin';
import { parseUserData } from '../users/utils';
import { BondsService } from '../bonds/bonds.service';
import { UsersService } from '../users/users.service';
import { Bonds } from '../bonds/bonds';
import dayjs from 'dayjs';
import { Ranks } from '../ranks/ranks_object';
import { binary_percent } from './binary_packs';

class Node {
  data: any;
  left: any;
  right: any;

  constructor(data: any) {
    this.data = data;
    this.left = null;
    this.right = null;
  }
}

@Injectable()
export class BinaryService {
  constructor(
    private readonly bondsService: BondsService,
    private readonly userService: UsersService,
  ) {}

  async increaseBinaryPoints(
    registerUserId: string,
    points: number,
    concept = 'Inscripción',
    txn_id?: string | null,
  ) {
    const batch = admin.batch();

    console.log('Repartir', points, 'puntos', concept, txn_id);

    const registerUser = await admin
      .collection('users')
      .doc(registerUserId)
      .get();
    let currentUser: string | null = registerUserId;

    do {
      const users: firestore.QuerySnapshot<
        firestore.DocumentData,
        firestore.DocumentData
      > = await admin
        .collection('users')
        .where(
          firestore.Filter.or(
            firestore.Filter.where('left_binary_user_id', '==', currentUser),
            firestore.Filter.where('right_binary_user_id', '==', currentUser),
          ),
        )
        .get();

      if (users.size > 0) {
        const user = users.docs[0]!;
        const userData = user.data();
        const position =
          userData.left_binary_user_id == currentUser ? 'left' : 'right';

        currentUser = user.id;

        // solo se suman puntos si el usuario esta activo
        const isActive = await this.userService.isActiveUser(user.id);

        if (isActive && user.id != registerUser.get('parent_binary_user_id')) {
          //se determina a que subcoleccion que se va a enfocar
          const positionCollection =
            position == 'left' ? 'left-points' : 'right-points';

          const subCollectionRef = admin
            .collection('users')
            .doc(user.id)
            .collection(positionCollection);

          const subCollectionPointsRef = admin
            .collection('users')
            .doc(user.id)
            .collection('points');

          /**
           * add (left | right) points
           * sirve para cobrar el binario
           */
          batch.set(subCollectionRef.doc(), {
            points,
            user_id: registerUserId,
            name: registerUser.get('name') || '',
            expires_at: dayjs().add(3, 'months').toDate(),
          });

          /**
           * (add points)
           * sirve para saber cuantos puntos totales historicos
           */
          batch.set(subCollectionPointsRef.doc(), {
            points,
            side: position || 'right',
            user_id: registerUserId,
            user_email: registerUser.get('email') || 'noemail',
            user_name: registerUser.get('name') || '',
            user_sponsor_id: registerUser.get('sponsor_id') || null,
            user_sponsor: registerUser.get('sponsor') || '',
            created_at: new Date(),
            expires_at: dayjs().add(3, 'months').toDate(),
            concept,
            txn_id: txn_id || '',
          });
        }
      } else {
        currentUser = null;
      }
    } while (currentUser);

    try {
      // Commit the batch
      const response = await batch.commit();
      return response;
    } catch (err) {
      await admin.collection('failed-binary-points').add({
        registerUserId,
      });
      throw err;
    }
  }

  async increaseSanguinePoints(registerUserId: string, sale_volumen: number) {
    const batch = admin.batch();

    console.log('Sumar ventas', sale_volumen);

    const registerUser = await admin
      .collection('users')
      .doc(registerUserId)
      .get();

    let currentUser: firestore.DocumentSnapshot<
      firestore.DocumentData,
      firestore.DocumentData
    > | null = registerUser;

    do {
      if (!currentUser.get('sponsor_id')) break;

      const sponsor = await admin
        .collection('users')
        .doc(currentUser.get('sponsor_id'))
        .get();

      if (sponsor.exists) {
        // solo se suman puntos si el usuario esta activo
        const isActive = true;

        if (isActive) {
          //se determina a que subcoleccion que se va a enfocar
          batch.update(sponsor.ref, {
            month_sales_volumen: firestore.FieldValue.increment(sale_volumen),
          });
        }

        currentUser = sponsor;
      } else {
        currentUser = null;
      }
    } while (currentUser);

    try {
      // Commit the batch
      const response = await batch.commit();
      return response;
    } catch (err) {
      await admin.collection('failed-sale-volumen').add({
        registerUserId,
      });
      throw err;
    }
  }

  async matchBinaryPoints(userId: string) {
    const user = await admin.collection('users').doc(userId).get();

    const leftPointsRef = admin
      .collection('users')
      .doc(userId)
      .collection('left-points');
    const rightPointsRef = admin
      .collection('users')
      .doc(userId)
      .collection('right-points');

    const leftDocs = await leftPointsRef.orderBy('starts_at').get();
    const rightDocs = await rightPointsRef.orderBy('starts_at').get();

    const leftPointsDocs = leftDocs.docs;
    const rightPointsDocs = rightDocs.docs;

    const batch = admin.batch();
    const points_to_pay =
      user.get('left_points') > user.get('right_points')
        ? user.get('right_points')
        : user.get('left_points');

    let remaining_left_points = points_to_pay;
    while (remaining_left_points > 0) {
      const oldestDoc = leftPointsDocs.shift();
      if (oldestDoc) {
        if (remaining_left_points >= oldestDoc.get('points')) {
          remaining_left_points -= oldestDoc.get('points');
          batch.delete(oldestDoc.ref);
        } else {
          batch.update(oldestDoc.ref, {
            points: firestore.FieldValue.increment(remaining_left_points * -1),
          });
          remaining_left_points = 0;
        }
      } else {
        break;
      }
    }

    let remaining_right_points = points_to_pay;
    while (remaining_right_points > 0) {
      const oldestDoc = rightPointsDocs.shift();
      if (oldestDoc) {
        if (remaining_right_points >= oldestDoc.get('points')) {
          remaining_right_points -= oldestDoc.get('points');
          batch.delete(oldestDoc.ref);
        } else {
          batch.update(oldestDoc.ref, {
            points: firestore.FieldValue.increment(remaining_right_points * -1),
          });
          remaining_right_points = 0;
        }
      } else {
        break;
      }
    }

    // Ejecutar la operación batch
    await batch.commit();

    const amount =
      points_to_pay *
      binary_percent[(user.get('rank')?.rank || 'none') as Ranks];
    if (user.get('is_binary_active')) {
      await this.bondsService.execBinary(userId, amount, {
        left_points: user.get('left_points'),
        right_points: user.get('right_points'),
      });
    } else {
      await this.bondsService.addLostProfit(userId, Bonds.BINARY, amount, null);
    }
  }

  async getBinaryUsers(
    session_user_id: string,
    start_user_id: string,
    max_levels: number,
    current_level: number,
    current_user: any,
  ) {
    if (current_level > max_levels) return current_user;

    if (session_user_id != start_user_id && current_level == 1) {
      const session_user = db.collection('users').doc(session_user_id);
      const is_left_people = await session_user
        .collection('left-people')
        .where('user_id', '==', start_user_id)
        .get();
      const is_right_people = await session_user
        .collection('right-people')
        .where('user_id', '==', start_user_id)
        .get();

      /**
       * Verificamos si el usuario logeado tiene dentro de su red
       * al usuario que quiere consultar
       */
      if (is_left_people.empty && is_right_people.empty) return null;
    }

    const user = await db.collection('users').doc(start_user_id).get();

    const node = new Node({
      ...parseUserData(user),
      parent_binary_user_id: user.get('parent_binary_user_id'),
    });

    if (user.get('left_binary_user_id')) {
      node.left = await this.getBinaryUsers(
        session_user_id,
        user.get('left_binary_user_id'),
        max_levels,
        current_level + 1,
        {},
      );
    }

    if (user.get('right_binary_user_id')) {
      node.right = await this.getBinaryUsers(
        session_user_id,
        user.get('right_binary_user_id'),
        max_levels,
        current_level + 1,
        {},
      );
    }

    if (current_level == 1) {
      return {
        left_points: user.get('left_points') || 0,
        right_points: user.get('right_points') || 0,
        tree: node,
      };
    }

    return node;
  }

  async deleteExpiredPoints() {
    const left_points = await db
      .collectionGroup('left_points')
      .where('expires_at', '<=', new Date())
      .get();
    const right_points = await db
      .collectionGroup('right_points')
      .where('expires_at', '<=', new Date())
      .get();

    const batch = db.batch();
    for (const d of left_points.docs) {
      batch.delete(d.ref);
    }
    for (const d of right_points.docs) {
      batch.delete(d.ref);
    }
    await batch.commit();
  }
}
