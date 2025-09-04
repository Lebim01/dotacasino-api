import { Injectable } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';

@Injectable()
export class ServersService {
  constructor(private readonly prisma: PrismaService) {}

  getServers() {
    return this.prisma.server.findMany({
      where: {
        enabled: true,
      },
    });
  }
}
