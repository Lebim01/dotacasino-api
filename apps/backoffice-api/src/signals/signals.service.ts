import { Injectable } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';

@Injectable()
export class SignalsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(page: number, limit: number) {
    const skip = page > 1 ? (page - 1) * limit : 0;

    const [signals, totalCount] = await Promise.all([
      this.prisma.signal.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.signal.count(),
    ]);

    return {
      totalRecords: totalCount,
      data: signals.map((r) => ({
        id: r.id,
        title: r.title,
        content: r.content,
        type: r.type,
        data: r.data,
        created_at: r.createdAt.toISOString(),
      })),
    };
  }

  async getOne(id: string) {
    const r = await this.prisma.signal.findUnique({
      where: { id },
    });

    if (!r) return null;

    return {
      id: r.id,
      title: r.title,
      content: r.content,
      type: r.type,
      data: r.data,
      created_at: r.createdAt.toISOString(),
    };
  }
}
