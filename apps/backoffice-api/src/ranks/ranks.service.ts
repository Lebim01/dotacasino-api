import { Injectable } from '@nestjs/common';
import { db as admin, db } from '../firebase/admin';
import dayjs from 'dayjs';
import {
  RankDetail,
  Ranks,
  ranksOrder,
  ranksPoints,
  ranks_object,
} from './ranks_object';
import * as googleTaskService from '../googletask/utils';
import { google } from '@google-cloud/tasks/build/protos/protos';
import { getBinaryPercent } from '../binary/binary_packs';
import { BondsService } from '../bonds/bonds.service';

type UserRank = {
  rank?: Ranks;
  order: number;
};

@Injectable()
export class RanksService {
  constructor(private readonly bondsService: BondsService) {}

  async cutRanks() {
    /* Obtener todos los usuraios */
    const users = await admin
      .collection('users')
      .orderBy('created_at', 'desc')
      .get();

    await Promise.all(
      users.docs.map(async (user) => {
        type Method = 'POST';
        const task: google.cloud.tasks.v2.ITask = {
          httpRequest: {
            httpMethod: 'POST' as Method,
            url: `${process.env.API_URL}/ranks/cutUserQueue/${user.id}`,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        };

        await googleTaskService.addToQueue(
          task,
          googleTaskService.getPathQueue('user-rank'),
        );
      }),
    );

    console.log(users.size, 'usuarios');

    return 'OK';
  }

  async updateRankQueue(id_user: string) {
    type Method = 'POST';

    const task: google.cloud.tasks.v2.ITask = {
      httpRequest: {
        httpMethod: 'POST' as Method,
        url: `${process.env.API_URL}/ranks/updateUserRank/${id_user}?is_corte=1`,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    };

    await googleTaskService.addToQueue(
      task,
      googleTaskService.getPathQueue('user-rank'),
    );

    return 'OK';
  }

  async registerHistoryUserRank(
    year: number,
    month: number,
    userId: string,
    rank: UserRank,
  ) {
    const user = await admin.collection('users').doc(userId).get();
    const past_max_rank: UserRank = user.get('max_rank')
      ? ranks_object[user.get('max_rank') as Ranks]
      : ranks_object.none;
    /**
     * Is true when max_rank is lower than new rank
     */
    const is_new_max_rank = past_max_rank.order < rank.order;

    await admin.collection('ranks').doc(`${year}-${month}`).set({
      created_at: new Date(),
    });
    await admin
      .collection('ranks')
      .doc(`${year}-${month}`)
      .collection('users')
      .doc(userId)
      .set({
        past_max_rank: past_max_rank,
        current_rank: rank,
        new_max_rank: is_new_max_rank ? past_max_rank : rank,
        new_rank: is_new_max_rank,
      });

    if (is_new_max_rank) {
      await admin
        .collection('users')
        .doc(userId)
        .collection('rank-promotion')
        .add({
          created_at: new Date(),
          rank: rank.rank || Ranks.NONE,
        });
      await admin.collection('rank-promotion').add({
        id_user: userId,
        name: user.get('name') || '',
        created_at: new Date(),
        rank: rank.rank || Ranks.NONE,
      });
    }
  }

  async updateUserRank(id_user: string, is_corte: boolean) {
    const user = await admin.collection('users').doc(id_user).get();
    const rankData = await this.getRankUser(id_user);

    /**
     * Guardar rango corte (previsualizar)
     */
    await admin.collection('users').doc(id_user).update({
      rank: rankData.rank,
    });

    /**
     * Guardar historial de rangos
     */
    if (is_corte) {
      const start = dayjs();

      /**
       * Modificar estructura de rango
       */
      await this.updateUserNewRank(id_user, rankData.rank);

      /**
       * Registrar rank promotion
       */
      await this.registerHistoryUserRank(
        start.year(),
        start.month(),
        id_user,
        rankData,
      );

      /**
       * Registrar rank history (user collection)
       */
      await this.insertRank(
        id_user,
        rankData.rank,
        start.year(),
        start.month(),
        rankData.points,
      );

      /**
       * Pagar bono
       */
      if (rankData.rank != 'none') {
        await this.bondsService.execRank(id_user, rankData.rank);
      }

      /**
       * Guardar maximo rango
       */
      if (!user.get('max_rank')) {
        await admin.collection('users').doc(id_user).update({
          max_rank: rankData.rank,
        });
      } else {
        const orderPastMaxRank = ranksOrder.findIndex(
          (r) => r == user.get('max_rank'),
        );
        const orderNewRank = ranksOrder.findIndex((r) => r == rankData.rank);
        if (orderNewRank > orderPastMaxRank) {
          await admin.collection('users').doc(id_user).update({
            max_rank: rankData.rank,
          });
        }
      }
    }

    return rankData;
  }

  async updateUserNewRank(id_user: string, rank: Ranks) {
    const left_people = await db
      .collectionGroup('left-people')
      .where('user_id', '==', id_user)
      .get();
    const right_people = await db
      .collectionGroup('right-people')
      .where('user_id', '==', id_user)
      .get();
    const batch = db.batch();

    for (const d of left_people.docs) {
      batch.update(d.ref, {
        rank,
      });
    }
    for (const d of right_people.docs) {
      batch.update(d.ref, {
        rank,
      });
    }
    await batch.commit();
  }

  async getRankUser(userId: string): Promise<any> {
    const points = await this.getPoints(userId);
    const rank = await this.getRank(userId, points);

    return {
      order: rank.order,
      rank: rank.rank,
      points,
    };
  }

  async getPoints(
    userId: string,
  ): Promise<{ left: number; right: number; smaller: 'left' | 'right' }> {
    const user_points = await admin
      .collection('users')
      .doc(userId)
      .collection('points')
      .where('created_at', '>=', dayjs().startOf('month').toDate())
      .where('created_at', '<=', dayjs().endOf('month').toDate())
      .get();

    const left = user_points.docs.reduce(
      (a, b) => a + (b.get('side') == 'left' ? Number(b.get('points')) : 0),
      0,
    );
    const right = user_points.docs.reduce(
      (a, b) => a + (b.get('side') == 'right' ? Number(b.get('points')) : 0),
      0,
    );

    return {
      left,
      right,
      smaller: left < right ? 'left' : 'right',
    };
  }

  async getRank(
    userId: string,
    points: { left: number; right: number; smaller: 'left' | 'right' },
  ): Promise<{
    rank: RankDetail;
    next_rank: Ranks;
    order: number;
    points: { left: number; right: number; smaller: 'left' | 'right' };
    missing_points: number;
    binary_is_active: boolean;
  }> {
    const points_smaller_leg = points[points.smaller];

    let rank: RankDetail = ranks_object.none;
    let next_rank: Ranks = Ranks.NONE;
    let missing_points = 0;

    const user = await admin.collection('users').doc(userId).get();

    const left_people = await user.ref.collection('left-people').get();
    const right_people = await user.ref.collection('right-people').get();

    const binary_is_active =
      left_people.docs.some((r) => r.get('membership_status') == 'paid') &&
      right_people.docs.some((r) => r.get('membership_status') == 'paid');

    const ranks_left = left_people.docs
      .map((r) => r.get('rank'))
      .sort(
        (a, b) =>
          ranksOrder.findIndex((value) => value == a) -
          ranksOrder.findIndex((value) => value == b),
      );
    const ranks_right = right_people.docs
      .map((r) => r.get('rank'))
      .sort(
        (a, b) =>
          ranksOrder.findIndex((value) => value == a) -
          ranksOrder.findIndex((value) => value == b),
      );

    const reverse_ranks = [...ranksOrder].reverse();
    for (let i = 0; i < ranksOrder.length; i++) {
      const rankKey = reverse_ranks[i];
      const currentRank = ranks_object[rankKey];

      // la pierna mas corta tiene los puntos necesarios
      const hasPoints =
        points_smaller_leg >= currentRank.start_points + ranksPoints[rankKey];

      /**
       * Cumple con la estructura de rangos
       */
      let hasRanks = true;
      if (currentRank.ranks.length > 0) {
        const checkRanksBySide = (
          ranksNeed: Ranks[], // estructura de rangos
          ranksUsersSide: string[], // listado de rangos de los usuarios ordenados del mayor al menor
        ) => {
          return ranksNeed.every(
            (rank, index) =>
              ranksOrder.findIndex((v) => v == ranksUsersSide[index]) >=
              ranksOrder.findIndex((v) => v == rank),
          );
        };

        const hasRanksLeftRight =
          checkRanksBySide(currentRank.ranks[0], ranks_left) &&
          checkRanksBySide(currentRank.ranks[1], ranks_right);

        const hasRanksRightLeft =
          checkRanksBySide(currentRank.ranks[0], ranks_right) &&
          checkRanksBySide(currentRank.ranks[1], ranks_left);

        hasRanks = hasRanksLeftRight || hasRanksRightLeft;
      }

      /**
       * Si cumple con puntos y estructura de rangos
       */
      if (hasPoints && hasRanks) {
        rank = currentRank;
        if (i < ranksOrder.length - 1) {
          const nextRankKey = reverse_ranks[i + 1];
          missing_points = ranksPoints[rankKey] - points_smaller_leg;
          next_rank = nextRankKey;
        }
        break;
      }
    }

    const order = rank?.key ? (ranks_object[rank.key]?.order ?? -1) : -1;

    return {
      rank,
      missing_points,
      next_rank,
      order,
      points,
      binary_is_active,
    };
  }

  async insertRank(
    userId: string,
    rank: string,
    year: number,
    month: number,
    points: { left: number; right: number },
  ) {
    try {
      await admin
        .collection('users')
        .doc(userId)
        .collection('rank_history')
        .doc(`${year}-${month}`)
        .set({
          rank,
          points,
        });
    } catch (error) {
      console.error('Error al agregar documento:', error);
    }
  }

  async getRankKey(id_user: string, rank_key: Ranks) {
    const user = await admin.collection('users').doc(id_user).get();
    const current = ranks_object[rank_key];
    const next_rank = ranks_object[ranksOrder[current.order + 1]];
    return {
      ...current,
      next_rank,
      binary_percent: getBinaryPercent(user.get('rank')),
    };
  }
}
