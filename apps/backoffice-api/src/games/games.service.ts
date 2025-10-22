import { Injectable } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async adminlist() {
    const games = await this.prisma.game.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });
    
    return games;
  }
}
