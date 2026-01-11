import { HttpException, Injectable } from '@nestjs/common';
import { ListGamesDto } from './dto/list-games.dto';
import { PrismaService } from 'libs/db/src/prisma.service';
import { Prisma } from '@prisma/client';
import { BetService } from '../bet/bet.service';
import { DOMAINS } from 'libs/shared/src/domains';

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

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bet: BetService,
  ) { }

  async list(q: ListGamesDto) {
    const where: Prisma.GameWhereInput = {
      enabled: true,
      show: true,
      hall: DOMAINS[q.domain].id,
    };

    if (q.category) {
      where.categories = {
        some: {
          id: q.category,
        },
      };
    }
    if (q.device) where.devices = { has: q.device };
    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: 'insensitive' } },
        { slug: { contains: q.search, mode: 'insensitive' } },
        { gameType: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: 'insensitive' } },
        { slug: { contains: q.search, mode: 'insensitive' } },
        { gameType: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    if (q.provider) {
      where.gameProviderId = {
        equals: q.provider,
      };
    }

    const skip = (q.page - 1) * q.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.game.findMany({
        where,
        orderBy: {
          priority: 'desc',
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

  async providers(domain: string) {
    const hall = DOMAINS[domain];
    const result: any[] = await this.prisma
      .$queryRawUnsafe(`
        SELECT gp.id, gp.name, COUNT(g.id)::int as game_count
        FROM "GameProvider" gp
        LEFT JOIN "Game" g ON gp.id = g."gameProviderId" AND g.hall = '${hall.id}'
        GROUP BY gp.id, gp.name
        ORDER BY game_count DESC
      `,
      );
    return result.filter(r => r.game_count > 0);
  }

  async openGame(gameSlug: string, domain: string, userId: string) {
    const game = await this.prisma.game.findFirst({
      where: {
        slug: {
          equals: gameSlug,
        },
        show: true,
      },
    });

    if (!game) {
      throw new HttpException('Not found', 401);
    }

    const response = await this.bet.openGame(game.betId, domain, userId);

    if (response.status == 'success') {
      await this.prisma.betSession.create({
        data: {
          hall: DOMAINS[domain].id,
          sessionId: response.content.gameRes.sessionId,
          gameId: game.id,
          userId,
        },
      });

      return { ...response, game };
    } else {
      console.log(response);
      return response;
    }
  }

  async categories() {
    return this.prisma.category.findMany({
      take: 5,
      orderBy: {
        order: 'desc'
      }
    });
  }
}
