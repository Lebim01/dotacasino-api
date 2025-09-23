import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import * as argon2 from 'argon2';
import { Role } from '@security/roles.enum';
import { makeRefCode } from 'libs/shared/src/refcode';

import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from 'unique-names-generator';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';

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
  ) {}

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
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
          email,
          country,
          passwordHash,
          roles: [Role.User],
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
}
