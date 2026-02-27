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
import { NodePaymentsService, Networks } from '@domain/node-payments/node-payments.service';
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
      const userId = Math.random().toString(36).substring(2, 12);
      const password_userapi = Math.random().toString(36).substring(2, 12);

      const sponsor = await this.prisma.user.findFirst({
        where: { id: sponsor_id },
      });

      const user = await this.prisma.user.create({
        data: {
          id: userId,
          email: email.toLowerCase(),
          country,
          passwordHash,
          roles: [USER_ROLES.USER],
          refCodeL,
          refCodeR,
          displayName,
          sponsorCode,
          sponsorId: sponsor_id || null,
          sponsorName: sponsor?.displayName ?? null,
          position: side,
          login_userapi: userId,
          password_userapi,
          membership: 'free',
          membershipStatus: 'paid',
          isNew: true,
          countDirectPeople: 0,
          countUnderlinePeople: 0,
        },
        select: { id: true, email: true, country: true, createdAt: true, password_userapi: true },
      });

      // Asignar posición en árbol binario de forma asíncrona
      this.authAcademy.assignBinaryPosition({
        id_user: user.id,
        points: 0,
        txn_id: null,
      }).catch((err) => console.error('assignBinaryPosition error', err));

      return user;
    } catch (err: any) {
      console.error(err);
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

    const user = await this.prisma.user.findUnique({
      where: { id: id_user },
    });

    if (!user) throw new HttpException('USER_NOT_FOUND', 404);

    if (user.membership) {
      // UPGRADE
      const diff =
        MEMBERSHIP_PRICES[membership_type] -
        MEMBERSHIP_PRICES[user.membership as Memberships];

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
    const user = await this.prisma.user.findUnique({
      where: { id: id_user },
    });
    const txn_id = user?.membership_link_disruptive;

    if (txn_id) {
      const txn = await this.prisma.nodePayment.findUnique({
        where: { id: txn_id },
      });
      if (!txn) return null;
      return {
        address: txn.address,
        amount: Number(txn.amount),
        membership_type: txn.category, // assuming category stores membership_type if not added specifically
        status: txn.paymentStatus,
        expires_at: txn.expiresAt?.toISOString(),
        qrcode_url: txn.qrcodeUrl,
        network: txn.type, // assuming type stores network if not added specifically
        status_text: null,
      };
    }

    return null;
  }

  async deleteQRMembership(id_user: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: id_user }
    });
    const txn_id = user?.membership_link_disruptive;

    if (txn_id) {
      await this.prisma.nodePayment.delete({
        where: { id: txn_id }
      });
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
