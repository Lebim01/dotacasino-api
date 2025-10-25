import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';

import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from 'unique-names-generator';
import { UserCommonService } from '@domain/users/users.service';

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

  async getUserById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
      },
    });
    return user;
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

  async setStdMexClabe(
    userId: string,
    data: {
      clabe: string;
      bank?: string;
      instructions?: any;
    },
  ) {
    const stdMexId = await this.prisma.user
      .findFirst({
        where: {
          id: userId,
        },
      })
      .then((r) => r?.stdMexId);

    const stdMex = await this.prisma.stdMex.upsert({
      create: {
        bank: data.bank || '',
        clabe: data.clabe || '',
        instructions: data.instructions || {},
      },
      update: data,
      where: {
        id: stdMexId || "",
      },
    });

    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        stdMexId: stdMex.id,
      },
    });
  }

  async getStdMexClabe(userId: string) {
    return this.prisma.user
      .findFirst({
        where: {
          id: userId,
        },
        include: {
          stdMex: true,
        },
      })
      .then((r) => r?.stdMex);
  }
}
