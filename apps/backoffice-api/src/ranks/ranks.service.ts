import { Injectable } from '@nestjs/common';
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
import { PrismaService } from 'libs/db/src/prisma.service';

type UserRank = {
  rank?: Ranks;
  order: number;
};

@Injectable()
export class RanksService {
  constructor(
    private readonly bondsService: BondsService,
    private readonly prisma: PrismaService,
  ) { }

  async cutRanks() {
    /* Obtener todos los usuraios */
    /* Obtener todos los usuraios */
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    await Promise.all(
      users.map(async (user) => {
        type Method = 'POST';
        const task: google.cloud.tasks.v2.ITask = {
          httpRequest: {
            httpMethod: 'POST' as Method,
            url: `https://backoffice-api-1039762081728.us-central1.run.app/v1/ranks/cutUserQueue/${user.id}`,
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

    console.log(users.length, 'usuarios');

    return 'OK';
  }

  async updateRankQueue(id_user: string) {
    type Method = 'POST';

    const task: google.cloud.tasks.v2.ITask = {
      httpRequest: {
        httpMethod: 'POST' as Method,
        url: `https://backoffice-api-1039762081728.us-central1.run.app/v1/ranks/updateUserRank/${id_user}?is_corte=1`,
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) return;

    const past_max_rank: UserRank = user.maxRank
      ? ranks_object[user.maxRank as Ranks]
      : ranks_object.none;
    /**
     * Is true when max_rank is lower than new rank
     */
    const is_new_max_rank = past_max_rank.order < rank.order;

    // Nota: en SQL esta estructura requiere tablas para rank_history y rank_promotion
    // Suponemos que existen según el esquema inicial o las crearemos.
    // El esquema actual tiene UserRank y tal vez necesitemos una tabla RankPromotion.
    
    if (is_new_max_rank) {
      await this.prisma.rankPromotion.create({
        data: {
          userId,
          name: user.displayName || '',
          rank: rank.rank || Ranks.NONE,
        },
      });
    }
  }

  async updateUserRank(id_user: string, is_corte: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: id_user },
    });
    if (!user) return;

    const rankData = await this.getRankUser(id_user);

    /**
     * Guardar rango corte (previsualizar)
     */
    await this.prisma.user.update({
      where: { id: id_user },
      data: { rank: rankData.rank },
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
      if (!user.maxRank) {
        await this.prisma.user.update({
          where: { id: id_user },
          data: { maxRank: rankData.rank },
        });
      } else {
        const orderPastMaxRank = ranksOrder.findIndex(
          (r) => r == user.maxRank,
        );
        const orderNewRank = ranksOrder.findIndex((r) => r == rankData.rank);
        if (orderNewRank > orderPastMaxRank) {
          await this.prisma.user.update({
            where: { id: id_user },
            data: { maxRank: rankData.rank },
          });
        }
      }
    }

    return rankData;
  }

  async updateUserNewRank(id_user: string, rank: Ranks) {
    // En SQL no tenemos collection group para esto de la misma forma, 
    // pero podemos hacer un update masivo si sabemos quiénes tienen a este usuario en su rama.
    // Sin embargo, en el esquema actual, el rank del usuario está en su propia fila.
    // Si hay una tabla denormalizada para 'members' de una pierna, habría que actualizarla.
    // Por ahora, asumimos que solo actualizamos el rank del usuario (que ya se hizo arriba).
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
    const user_points = await this.prisma.binaryPoint.findMany({
      where: {
        userId,
        createdAt: {
          gte: dayjs().startOf('month').toDate(),
          lte: dayjs().endOf('month').toDate(),
        },
      },
      select: { side: true, points: true },
    });

    const left = user_points.reduce(
      (a, b) => a + (b.side == 'left' ? Number(b.points) : 0),
      0,
    );
    const right = user_points.reduce(
      (a, b) => a + (b.side == 'right' ? Number(b.points) : 0),
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

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new Error('User not found');

    const left_people = await this.prisma.user.findMany({
      where: { sponsorId: userId, position: 'left' },
    });
    const right_people = await this.prisma.user.findMany({
      where: { sponsorId: userId, position: 'right' },
    });

    const binary_is_active =
      left_people.some((r) => r.membershipStatus == 'paid') &&
      right_people.some((r) => r.membershipStatus == 'paid');

    const ranks_left = left_people
      .map((r) => r.rank || 'none')
      .sort(
        (a, b) =>
          ranksOrder.findIndex((value) => value == a) -
          ranksOrder.findIndex((value) => value == b),
      );
    const ranks_right = right_people
      .map((r) => (r.rank || 'none') as any)
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
      await this.prisma.rankHistory.create({
        data: {
          userId,
          rank,
          leftPoints: points.left,
          rightPoints: points.right,
          period: `${year}-${month}`,
        },
      });
    } catch (error) {
      console.error('Error al agregar documento:', error);
    }
  }

  async getRankKey(id_user: string, rank_key: Ranks) {
    const user = await this.prisma.user.findUnique({
      where: { id: id_user },
    });
    if (!user) throw new Error('User not found');
    const current = ranks_object[rank_key];
    const next_rank = ranks_object[ranksOrder[current.order + 1]];
    return {
      ...current,
      next_rank,
      binary_percent: getBinaryPercent((user.rank || 'none') as any),
    };
  }
}
