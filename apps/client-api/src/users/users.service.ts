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
import { HttpService } from '@nestjs/axios';
import { RegisterAuthDto } from './dto/registeracademy.dto';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
  ) {}

  async registerAcademy(dto: RegisterAuthDto) {
    const response = await this.http.axiosRef.post(
      `${process.env.API_URL_ACADEMY}/auth/register`,
      dto,
    );

    return response.data.id;
  }

  async createUser(
    email: string,
    password: string,
    country: string,
    sponsor_id: string,
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

      const firebaseId = await this.registerAcademy({
        country,
        email,
        password,
        name: displayName,
        phone: '',
        refCodeL,
        refCodeR,
        side: '',
        sponsor_id: sponsor!.firebaseId,
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
          firebaseId,
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
