import { Injectable, ConflictException } from '@nestjs/common';
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
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(email: string, password: string, country: string) {
    const passwordHash = await argon2.hash(password);

    try {
      return await this.prisma.user.create({
        data: {
          email,
          country,
          passwordHash,
          roles: [Role.User],
          refCode: makeRefCode(),
          displayName: generateDisplayName(),
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

  getReferenceCode(code: string) {}
}
