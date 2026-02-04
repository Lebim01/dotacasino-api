import { Injectable } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import { ListGamesDto } from './dto/list-games.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) { }

  async list(q: ListGamesDto) {
    const where: Prisma.GameWhereInput = { enabled: true };

    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: 'insensitive' } },
        { slug: { contains: q.search, mode: 'insensitive' } },
        { gameType: { contains: q.search, mode: 'insensitive' } },
      ];
    }

    if (q.category) {
      where.categories = {
        some: {
          id: q.category,
        },
      };
    }

    const skip = (q.page - 1) * q.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.game.findMany({
        where,
        orderBy: {
          createdAt: 'asc',
        },
        skip,
        take: q.pageSize,
        select: {
          id: true,
          slug: true,
          title: true,
          categories: true,
          devices: true,
          thumbnailUrl: true,
          show: true,
          GameProvider: true,
        },
      }),
      this.prisma.game.count({ where }),
    ]);

    return {
      page: q.page,
      pageSize: q.pageSize,
      total,
      items,
    };
  }

  async changeshow(id: string, show: boolean) {
    return this.prisma.game.update({
      where: {
        id,
      },
      data: {
        show,
      },
    });
  }

  async providers() {
    return this.prisma.gameProvider.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async categories() {
    return this.prisma.category.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async updateProviderRestrictions(providerId: string, countryCodes: string[]) {
    const countries = await this.prisma.country.findMany({
      where: {
        code: {
          in: countryCodes,
        },
      },
    });

    return this.prisma.gameProvider.update({
      where: {
        id: providerId,
      },
      data: {
        restrictedCountries: {
          set: countries.map((c) => ({ id: c.id })),
        },
      },
    });
  }
}
