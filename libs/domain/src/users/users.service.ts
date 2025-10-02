import {
  Injectable,
  ConflictException,
  Logger,
  HttpException,
} from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import * as argon2 from 'argon2';
import { makeRefCode } from 'libs/shared/src/refcode';

import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from 'unique-names-generator';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';
import { Memberships } from 'apps/backoffice-api/src/types';
import { MEMBERSHIP_PRICES } from 'apps/backoffice-api/src/constants';
import { db } from 'apps/backoffice-api/src/firebase/admin';
import {
  DisruptiveService,
  Networks,
} from '@domain/disruptive/disruptive.service';
import { USER_ROLES } from 'apps/backoffice-api/src/auth/auth.constants';

export function generateDisplayName() {
  return (
    uniqueNamesGenerator({
      dictionaries: [adjectives, colors, animals],
      separator: '',
      style: 'capital',
      length: 2,
    }) + Math.floor(Math.random() * 1000)
  );
}

@Injectable()
export class UserCommonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authAcademy: AuthAcademyService,
    private readonly disruptiveService: DisruptiveService,
  ) {}

  async getUserById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
      },
    });
    return user;
  }

  async getUserByIdFirebase(id: string) {
    const user = await db.collection('users').doc(id).get();
    return user;
  }

  async createUser(
    email: string,
    password: string,
    country: string,
    sponsor_id: string,
    side: 'left' | 'right',
  ) {
    const passwordHash = await argon2.hash(password);

    try {
      const displayName = generateDisplayName();
      const refCodeL = makeRefCode();
      const refCodeR = makeRefCode();

      const sponsor = await this.prisma.user.findFirst({
        where: {
          id: sponsor_id,
        },
      });

      const res = await this.authAcademy.registerUser({
        country,
        email,
        password,
        name: displayName,
        phone: '',
        refCodeL,
        refCodeR,
        side,
        sponsor_id: sponsor?.firebaseId || null,
        username: displayName,
      });

      return await this.prisma.user.create({
        data: {
          id: res.id,
          email,
          country,
          passwordHash,
          roles: [USER_ROLES.ADMIN],
          refCodeL,
          refCodeR,
          firebaseId: res.id,
          displayName,
        },
        select: { id: true, email: true, country: true, createdAt: true },
      });
    } catch (err: any) {
      if (err?.code === 'P2002' && err?.meta?.target?.includes('email')) {
        throw new ConflictException('El email ya está registrado');
      }
      throw err;
    }
  }

  getReferenceCode(code: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          {
            refCodeL: code,
          },
          {
            refCodeR: code,
          },
        ],
      },
      select: {
        displayName: true,
      },
    });
  }

  async createMembershipQR(
    id_user: string,
    membership_type: Memberships,
    network: Networks,
  ) {
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
        network,
        diff,
        true,
      );
    } else {
      await this.disruptiveService.createMembership(
        id_user,
        membership_type,
        network,
        amount,
        true,
      );
    }
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

  async deleteQRMembership(id_user: string) {
    const user = await db.collection('users').doc(id_user).get();
    const txn_id = user.get('membership_link_disruptive');

    if (txn_id) {
      await db.collection('disruptive-academy').doc(txn_id).delete();
      return 'OK'
    }

    return 'NO';
  }
}
