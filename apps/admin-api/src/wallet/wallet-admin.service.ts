import { Injectable, NotFoundException } from '@nestjs/common';

import Decimal from 'decimal.js';
import { QueryBalancesDto } from './dto/query-balances.dto';
import { TopupDto } from './dto/topup.dto';
import { WalletService } from '@domain/wallet/wallet.service';
import { PrismaService } from 'libs/db/src/prisma.service';
import { CURRENCY } from 'libs/shared/src/currency';

@Injectable()
export class WalletAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  async listBalances(q: QueryBalancesDto) {
    const where: any = {
      currency: CURRENCY,
      user: q.search
        ? { email: { contains: q.search, mode: 'insensitive' } }
        : undefined,
    };

    const skip = (q.page - 1) * q.pageSize;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.wallet.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              country: true,
              createdAt: true,
            },
          },
        },
        orderBy: { user: { createdAt: 'desc' } },
        skip,
        take: q.pageSize,
      }),
      this.prisma.wallet.count({ where }),
    ]);

    return {
      page: q.page,
      pageSize: q.pageSize,
      total,
      items: rows.map((w) => ({
        userId: w.user.id,
        email: w.user.email,
        displayName: w.user.displayName,
        country: w.user.country,
        balance: Number(w.balance),
        currency: w.currency,
        createdAt: w.user.createdAt,
      })),
    };
  }

  async getUserBalance(userId: string) {
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId, currency: CURRENCY },
      select: { balance: true, currency: true },
    });
    if (!wallet) {
      // si no existe, lo consideramos 0 y opcionalmente lo creamos
      return { userId, balance: 0, currency: CURRENCY };
    }
    return {
      userId,
      balance: Number(wallet.balance),
      currency: wallet.currency,
    };
  }

  async topup(userId: string, dto: TopupDto) {
    // valida usuario
    const exists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Usuario no encontrado');

    const idk = dto.idempotencyKey ?? `ADMIN|${userId}|${Date.now()}`;

    const balance = await this.wallet.credit({
      userId,
      amount: new Decimal(dto.amount),
      reason: 'TOPUP',
      idempotencyKey: idk,
      meta: { note: dto.note ?? null, actor: 'admin-api' },
    });

    return {
      userId,
      balance: balance.toString(),
      currency: CURRENCY,
      idempotencyKey: idk,
    };
  }
}
