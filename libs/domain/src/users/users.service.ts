import { Injectable, ConflictException, HttpException } from '@nestjs/common';
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
  NodePaymentsService,
  Networks,
} from '@domain/node-payments/node-payments.service';
import { USER_ROLES } from 'apps/backoffice-api/src/auth/auth.constants';

function generateDisplayName() {
  return (
    uniqueNamesGenerator({
      dictionaries: [adjectives, colors, animals],
      separator: '',
      style: 'capital',
      length: 2,
    }) + Math.floor(Math.random() * 1000)
  );
}

type StdMexClabeInfo = {
  clabe: string;
  bank?: string;
  instructions?: { BENEFICIARIO: string; CONCEPTO: string };
};

@Injectable()
export class UserCommonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authAcademy: AuthAcademyService,
    private readonly nodePaymentsService: NodePaymentsService,
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
    sponsorCode?: string,
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
          roles: [USER_ROLES.USER],
          refCodeL,
          refCodeR,
          firebaseId: res.id,
          displayName,
          sponsorCode,
          login_userapi: res.id,
          password_userapi: Math.random().toString(36).substring(2, 12),
        },
        select: { id: true, email: true, country: true, createdAt: true, password_userapi: true },
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

      await this.nodePaymentsService.createMembershipTransaction(
        id_user,
        membership_type,
        network,
        diff,
        true,
      );
    } else {
      await this.nodePaymentsService.createMembershipTransaction(
        id_user,
        membership_type,
        network,
        amount,
        false,
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
        network: txn.get('network'),
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
      return 'OK';
    }

    return 'NO';
  }

  async getStdMexClabe(userId: string): Promise<StdMexClabeInfo | null> {
    // TODO: Lee desde tu tabla Users o tabla dedicada (p.ej. UserStdMex { userId, clabe, ... })
    return null;
  }

  async setStdMexClabe(userId: string, info: StdMexClabeInfo): Promise<void> {
    // TODO: Inserta/actualiza de forma que cada usuario tenga SÓLO UNA CLABE
    // Usa unique index por (userId) o por (clabe) según tu modelo
  }
}
