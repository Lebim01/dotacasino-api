import { Injectable } from '@nestjs/common';
import { ListGamesDto } from './dto/list-games.dto';
import { PrismaService } from 'libs/db/src/prisma.service';
import { Prisma } from '@prisma/client';

// 1) Define el SELECT de forma tipada y reutilizable
const gameCardSelect = Prisma.validator<Prisma.GameSelect>()({
  id: true,
  slug: true,
  title: true,

  rtp: true,
  devices: true,
  tags: true,
  thumbnailUrl: true,
  order: true,
  createdAt: true,
});

// 2) Deriva el tipo **correcto** del payload (incluye provider)
type GameCard = Prisma.GameGetPayload<{ select: typeof gameCardSelect }>;

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: ListGamesDto) {
    const where: any = { enabled: true };

    if (q.provider) where.provider = { code: q.provider };
    if (q.platformType) where.platformType = q.platformType;
    if (q.category) where.category = q.category;
    if (q.device) where.devices = { has: q.device };
    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: 'insensitive' } },
        { slug: { contains: q.search, mode: 'insensitive' } },
        { gameType: { contains: q.search, mode: 'insensitive' } },
        { providerGameId: { contains: q.search, mode: 'insensitive' } },
      ];
    }

    const orderBy:
      | Prisma.GameOrderByWithRelationInput
      | Prisma.GameOrderByWithRelationInput[] =
      q.sort === 'alpha'
        ? { title: 'asc' }
        : q.sort === 'recent'
          ? { createdAt: 'desc' }
          : [{ order: 'asc' }, { title: 'asc' }];

    const skip = (q.page - 1) * q.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.game.findMany({
        where,
        orderBy,
        skip,
        take: q.pageSize,
        select: {
          id: true,
          slug: true,
          title: true,
          category: true,
          devices: true,
          thumbnailUrl: true,
          enabled: true,
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
}
