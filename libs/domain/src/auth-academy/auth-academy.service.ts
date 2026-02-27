import { Injectable } from '@nestjs/common';
import { USER_ROLES } from 'apps/backoffice-api/src/auth/auth.constants';
import { RegisterAuthDto } from 'apps/backoffice-api/src/auth/dto/register-auth.dto';
import { PayloadAssignBinaryPosition } from 'apps/backoffice-api/src/subscriptions/types';
import { getLimitMembership } from 'apps/backoffice-api/src/utils/deposits';
import * as argon2 from 'argon2';
import { PrismaService } from 'libs/db/src/prisma.service';
import Decimal from 'decimal.js';

@Injectable()
export class AuthAcademyService {
  constructor(private readonly prisma: PrismaService) {}

  async calculatePositionOfBinary(
    sponsor_id: string,
    position: 'left' | 'right',
  ) {
    let parent_id: null | string = null;
    let next_user_id = sponsor_id;
    let visited = new Set<string>();

    while (!parent_id) {
      if (visited.has(next_user_id)) {
        console.log('REPETIDO', next_user_id);
        break;
      }
      visited.add(next_user_id);

      const sponsorData = await this.prisma.user.findUnique({
        where: { id: next_user_id },
        select: { leftBinaryUserId: true, rightBinaryUserId: true }
      });

      if (!sponsorData) break;

      const childId = position === 'left' ? sponsorData.leftBinaryUserId : sponsorData.rightBinaryUserId;

      if (childId) {
        next_user_id = childId;
      } else {
        parent_id = next_user_id;
      }
    }

    return {
      parent_id,
    };
  }

  async increaseUnderlinePeople(registerUserId: string) {
    let user = await this.prisma.user.findUnique({
      where: { id: registerUserId },
      select: { parentBinaryUserId: true, id: true }
    });

    while (user && user.parentBinaryUserId && user.parentBinaryUserId !== registerUserId) {
        const parentId = user.parentBinaryUserId;
        const parent = await this.prisma.user.findUnique({
            where: { id: parentId },
            select: { id: true, leftBinaryUserId: true, rightBinaryUserId: true }
        });

        if (parent) {
            const side = parent.leftBinaryUserId === user.id ? 'left' : 'right';

            await this.prisma.$transaction([
                this.prisma.user.update({
                    where: { id: parentId },
                    data: { countUnderlinePeople: { increment: 1 } }
                }),
                this.prisma.binaryTreeRelation.upsert({
                    where: { userId_ancestorId: { userId: registerUserId, ancestorId: parentId } },
                    create: { userId: registerUserId, ancestorId: parentId, side },
                    update: { side }
                })
            ]);

            user = await this.prisma.user.findUnique({
                where: { id: parentId },
                select: { parentBinaryUserId: true, id: true }
            });
        } else {
            break;
        }
    }
  }

  async assignBinaryPosition(payload: PayloadAssignBinaryPosition) {
    console.log('assignBinaryPosition', payload);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.id_user }
    });

    if (!user) return;

    /**
     * Asignar posicion en el binario (SOLO USUARIOS NUEVOS)
     */
    const hasBinaryPosition = !!user.parentBinaryUserId;
    if (!hasBinaryPosition) {
      const finish_position = user.position || 'right';

      let binaryPosition: { parent_id: string | null } = {
        parent_id: null,
      };

      console.log('sponsor_id', user.sponsorId);

      while (!binaryPosition?.parent_id) {
        binaryPosition = await this.calculatePositionOfBinary(
          user.sponsorId || '4h3b3ZGUXw8n3xUSZT6d', // sponsor o codigo 1
          finish_position as any,
        );
      }

      console.log(binaryPosition);

      if (!binaryPosition?.parent_id) {
        throw new Error('Error al posicionar el binario');
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
            parentBinaryUserId: binaryPosition.parent_id,
            position: finish_position,
        }
      });

      if (user.sponsorId) {
        await this.prisma.user.update({
          where: { id: user.sponsorId },
          data: {
              countDirectPeopleThisCycle: { increment: 1 }
          }
        });
      }

      try {
        await this.prisma.user.update({
            where: { id: binaryPosition.parent_id },
            data: {
                [finish_position == 'left' ? 'leftBinaryUserId' : 'rightBinaryUserId']: user.id
            }
        });
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
    let sponsor_name: string | null | undefined = null;
    let position: string | null = null;

    if (userObject.sponsor_id) {
      const sponsor = await this.prisma.user.findUnique({
          where: { id: userObject.sponsor_id }
      });
      position = userObject.side;
      sponsor_name = sponsor?.displayName ?? null;
    }

    const formattedUser = await this.formatNewUser(userObject);

    // En Prisma creamos el usuario directamente
    const user = await this.prisma.user.create({
        data: {
            ...formattedUser,
            position,
            sponsorName: sponsor_name,
        }
    });

    // En el original se llamaba a addQueueBinaryPosition, aquí lo llamamos directamente
    await this.assignBinaryPosition({
      id_user: user.id,
      points: 0,
      txn_id: null,
    });

    const { id, ...restFormatted } = formattedUser;
    return {
      id: user.id,
      ...restFormatted,
    };
  }

  async getPassword(pass: string) {
    return argon2.hash(pass);
  }

  async formatNewUser(userObject: RegisterAuthDto) {
    const { name, email, password: plainPass } = userObject;
    const plainToHash = await this.getPassword(plainPass);
    const roles = [USER_ROLES.USER];

    // Mapeamos al formato de Prisma User
    return {
      id: Math.random().toString(36).substring(2, 12),
      displayName: name,
      passwordHash: plainToHash,
      email: email.toLowerCase(),
      roles,
      sponsorId: userObject.sponsor_id,
      createdAt: new Date(),
      profits: new Decimal(0),
      isNew: true,
      refCodeL: userObject.refCodeL || Math.random().toString(36).substring(2, 8),
      refCodeR: userObject.refCodeR || Math.random().toString(36).substring(2, 8),
      country: userObject.country,
      phone: userObject.phone,
      username: userObject.username,

      membership: 'free',
      membershipStartedAt: new Date(),
      membershipExpiresAt: null,
      membershipCapLimit: new Decimal(getLimitMembership('free')),
      membershipStatus: 'paid',
      membershipCapCurrent: new Decimal(0),

      countDirectPeople: 0,
      countUnderlinePeople: 0,
      monthSalesVolumen: new Decimal(0),
      totalDeposits: new Decimal(0),
      compoundInterest: false,

      bondDirect: new Decimal(0),
      bondBinary: new Decimal(0),
      bondRewards: new Decimal(0),
      bondRank: new Decimal(0),

      isBinaryActive: false,
      leftPoints: new Decimal(0),
      rightPoints: new Decimal(0),
      rank: 'none',
      maxRank: 'none',
    };
  }
}
