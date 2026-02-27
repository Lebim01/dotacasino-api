import { Injectable, NotFoundException } from '@nestjs/common';

import Decimal from 'decimal.js';
import { QueryBalancesDto } from './dto/query-balances.dto';
import { TopupDto } from './dto/topup.dto';
import { WalletService } from '@domain/wallet/wallet.service';
import { PrismaService } from 'libs/db/src/prisma.service';

@Injectable()
export class WalletAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  async listBalances(q: QueryBalancesDto) {
    const where: any = {
      user: q.search
        ? { email: { contains: q.search, mode: 'insensitive' } }
        : undefined,
    };

    const skip = (q.page - 1) * q.pageSize;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.wallet.findMany({
        where,
        include: {
          User: {
            select: {
              id: true,
              email: true,
              displayName: true,
              country: true,
              createdAt: true,
            },
          },
        },
        orderBy: { User: { createdAt: 'desc' } },
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
        userId: w.User.id,
        email: w.User.email,
        displayName: w.User.displayName,
        country: w.User.country,
        balance: Number(w.balance),
        currency: w.currency,
        createdAt: w.User.createdAt,
      })),
    };
  }

  async getUserBalance(userId: string) {
    const currency = await this.wallet.getUserWalletCurrency(userId);
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId, currency },
      select: { balance: true, currency: true },
    });

    if (!wallet) {
      return { userId, balance: 0, currency };
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

    const currency = await this.wallet.getUserWalletCurrency(userId);

    return {
      userId,
      balance: balance.toString(),
      currency,
      idempotencyKey: idk,
    };
  }
}
