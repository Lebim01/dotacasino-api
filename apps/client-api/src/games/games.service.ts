import { HttpException, Injectable } from '@nestjs/common';
import { ListGamesDto } from './dto/list-games.dto';
import { PrismaService } from 'libs/db/src/prisma.service';
import { Prisma } from '@prisma/client';
import { BetService } from '../bet/bet.service';
import { DOMAINS, DOMAINS_BY_COUNTRY } from 'libs/shared/src/domains';
import { SoftGamingService } from 'libs/domain/src/soft-gaming/soft-gaming.service';

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bet: BetService,
    private readonly softGaming: SoftGamingService,
  ) { }

  async list(q: ListGamesDto) {
    const where: Prisma.GameWhereInput = {
      enabled: true,
      show: true,
      hall: DOMAINS[q.domain].id,
    };

    if(q.domain && DOMAINS_BY_COUNTRY[q.domain]) {
      q.country = DOMAINS_BY_COUNTRY[q.domain];
    }

    if (q.category) {
      where.categories = {
        some: {
          id: q.category,
        },
      };
    }

    if (q.categoryName) {
      where.categories = {
        some: {
          name: {
            contains: q.categoryName,
            mode: 'insensitive',
          },
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
    if (q.provider) {
      where.gameProviderId = {
        equals: q.provider,
      };
    }

    if (q.country) {
      where.GameProvider = {
        restrictedCountries: {
          none: {
            code: q.country,
          },
        },
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

  async providers(domain: string, country?: string) {
    const hall = DOMAINS[domain];
    const providers = await this.prisma.gameProvider.findMany({
      where: {
        restrictedCountries: country
          ? {
            none: {
              code: country,
            },
          }
          : undefined,
        games: {
          some: {
            hall: hall.id,
          },
        },
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        _count: {
          select: {
            games: {
              where: {
                hall: hall.id,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc'
      }
    });

    return providers.map((p) => ({
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl,
      game_count: p._count.games,
    })).sort((a, b) => b.game_count - a.game_count);
  }

  async openGame(gameSlug: string, domain: string, userId: string, ip: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    const game = await this.prisma.game.findFirst({
      where: {
        slug: {
          equals: gameSlug,
        },
        show: true,
        GameProvider: {
          restrictedCountries: {
            none: {
              code: user?.country || '',
            },
          },
        },
      },
    });

    if (!game) {
      throw new HttpException('Game not found or restricted in your country', 404);
    }

    const response = await this.softGaming.getAuthorizationUser(
      userId,
      game.id,
      ip,
      user?.password_userapi!
    );
    return { status: 'success', html: response, game };
  }

  async categories(take = -1) {
    return this.prisma.category.findMany({
      take: Number(take),
      orderBy: {
        order: 'desc',
      },
    });
  }
}
