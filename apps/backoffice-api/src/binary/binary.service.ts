import { Injectable } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
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
    private readonly prisma: PrismaService,
    private readonly bondsService: BondsService,
    private readonly userService: UsersService,
  ) { }

  async increaseBinaryPoints(
    registerUserId: string,
    points: number,
    concept = 'Inscripción',
    txn_id?: string | null,
  ) {
    console.log('Repartir', points, 'puntos', concept, txn_id);

    const registerUser = await this.prisma.user.findUnique({
      where: { id: registerUserId },
    });
    
    if (!registerUser) return;

    let previousUserId = registerUserId;
    let currentUserId = registerUser.parentBinaryUserId;

    while (currentUserId) {
      const currentUser = await this.prisma.user.findUnique({
        where: { id: currentUserId },
      });

      if (!currentUser) break;

      const position = currentUser.leftBinaryUserId === previousUserId ? 'left' : 'right';

      // solo se suman puntos si el usuario esta activo
      const isActive = await this.userService.isActiveUser(currentUser.id);

      if (isActive && currentUser.id !== registerUser.parentBinaryUserId) {
        await this.prisma.$transaction([
          // Servirá para cobrar el binario (matching)
          this.prisma.binaryPoint.create({
            data: {
              userId: currentUser.id,
              points,
              side: position,
              type: 'matching',
              originUserId: registerUserId,
              originName: registerUser.displayName,
              expiresAt: dayjs().add(3, 'months').toDate(),
            },
          }),
          // Servirá para historial histórico
          this.prisma.binaryPoint.create({
            data: {
              userId: currentUser.id,
              points,
              side: position,
              type: 'history',
              originUserId: registerUserId,
              originName: registerUser.displayName,
              originEmail: registerUser.email,
              concept,
              txnId: txn_id || '',
              expiresAt: dayjs().add(3, 'months').toDate(),
            },
          }),
          // Actualizar contadores directos en el usuario
          this.prisma.user.update({
            where: { id: currentUser.id },
            data: {
              [position === 'left' ? 'leftPoints' : 'rightPoints']: { increment: points },
            },
          }),
        ]);
      }

      previousUserId = currentUserId;
      currentUserId = currentUser.parentBinaryUserId;
    }
  }

  async increaseSanguinePoints(registerUserId: string, sale_volumen: number) {
    console.log('Sumar ventas', sale_volumen);

    const registerUser = await this.prisma.user.findUnique({
      where: { id: registerUserId },
    });

    if (!registerUser) return;

    let currentUserId = registerUser.sponsorId;

    while (currentUserId) {
      const currentUser = await this.prisma.user.findUnique({
        where: { id: currentUserId },
      });

      if (!currentUser) break;

      await this.prisma.user.update({
        where: { id: currentUser.id },
        data: {
          monthSalesVolumen: { increment: sale_volumen },
        },
      });

      currentUserId = currentUser.sponsorId;
    }
  }

  async matchBinaryPoints(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return;

    const leftPoints = Number(user.leftPoints);
    const rightPoints = Number(user.rightPoints);
    const points_to_pay = Math.min(leftPoints, rightPoints);

    if (points_to_pay <= 0) return;

    const leftPointsDocs = await this.prisma.binaryPoint.findMany({
      where: { userId, side: 'left', type: 'matching' },
      orderBy: { createdAt: 'asc' },
    });

    const rightPointsDocs = await this.prisma.binaryPoint.findMany({
      where: { userId, side: 'right', type: 'matching' },
      orderBy: { createdAt: 'asc' },
    });

    await this.prisma.$transaction(async (tx) => {
      let remaining_left_points = points_to_pay;
      for (const oldestDoc of leftPointsDocs) {
        if (remaining_left_points <= 0) break;
        const docPoints = Number(oldestDoc.points);
        if (remaining_left_points >= docPoints) {
          remaining_left_points -= docPoints;
          await tx.binaryPoint.delete({ where: { id: oldestDoc.id } });
        } else {
          await tx.binaryPoint.update({
            where: { id: oldestDoc.id },
            data: { points: { decrement: remaining_left_points } },
          });
          remaining_left_points = 0;
        }
      }

      let remaining_right_points = points_to_pay;
      for (const oldestDoc of rightPointsDocs) {
        if (remaining_right_points <= 0) break;
        const docPoints = Number(oldestDoc.points);
        if (remaining_right_points >= docPoints) {
          remaining_right_points -= docPoints;
          await tx.binaryPoint.delete({ where: { id: oldestDoc.id } });
        } else {
          await tx.binaryPoint.update({
            where: { id: oldestDoc.id },
            data: { points: { decrement: remaining_right_points } },
          });
          remaining_right_points = 0;
        }
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          leftPoints: { decrement: points_to_pay },
          rightPoints: { decrement: points_to_pay },
        },
      });
    });

    const userRank = 'none'; 
    const percent = binary_percent[userRank as Ranks] || 0;
    const amount = points_to_pay * percent;

    if (user.isBinaryActive) {
      await this.bondsService.execBinary(userId, amount, {
        left_points: leftPoints,
        right_points: rightPoints,
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

    if (session_user_id !== start_user_id && current_level === 1) {
        const isDescendant = await this.isBinaryDescendant(session_user_id, start_user_id);
        if (!isDescendant) return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: start_user_id },
    });

    if (!user) return null;

    const node = new Node({
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      membership: user.membership,
      membershipStatus: user.membershipStatus,
      parentBinaryUserId: user.parentBinaryUserId,
    });

    if (user.leftBinaryUserId) {
      node.left = await this.getBinaryUsers(
        session_user_id,
        user.leftBinaryUserId,
        max_levels,
        current_level + 1,
        {},
      );
    }

    if (user.rightBinaryUserId) {
      node.right = await this.getBinaryUsers(
        session_user_id,
        user.rightBinaryUserId,
        max_levels,
        current_level + 1,
        {},
      );
    }

    if (current_level === 1) {
      return {
        left_points: Number(user.leftPoints),
        right_points: Number(user.rightPoints),
        tree: node,
      };
    }

    return node;
  }

  private async isBinaryDescendant(ancestorId: string, descendantId: string): Promise<boolean> {
      let current = await this.prisma.user.findUnique({
          where: { id: descendantId },
          select: { parentBinaryUserId: true }
      });
      while (current && current.parentBinaryUserId) {
          if (current.parentBinaryUserId === ancestorId) return true;
          current = await this.prisma.user.findUnique({
              where: { id: current.parentBinaryUserId },
              select: { parentBinaryUserId: true }
          });
      }
      return false;
  }

  async deleteExpiredPoints() {
    await this.prisma.binaryPoint.deleteMany({
        where: {
            expiresAt: { lte: new Date() },
            type: 'matching'
        }
    });
  }
}
