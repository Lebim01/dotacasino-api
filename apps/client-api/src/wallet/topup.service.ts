import { ForbiddenException, Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';

import { UserTopupDto } from './dto/user-topup.dto';
import { PrismaService } from 'libs/db/src/prisma.service';
import { WalletService } from '@domain/wallet/wallet.service';
import { CURRENCY } from 'libs/shared/src/currency';

@Injectable()
export class TopupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  async directTopup(userId: string, dto: UserTopupDto) {
    // Gate por entorno/flag para que no sea “dinero gratis” en prod.
    if (process.env.ENABLE_DIRECT_TOPUP !== 'true') {
      throw new ForbiddenException('Topup directo no habilitado');
    }

    const idk = dto.idempotencyKey ?? `USER_TOPUP|${userId}|${Date.now()}`;

    // Idempotencia: si ya registramos ese topup, devolvemos el resultado previo
    const existing = await this.prisma.topup.findFirst({
      where: { idempotencyKey: idk, userId, status: 'SUCCEEDED' },
      select: { amount: true, createdAt: true },
    });

    if (existing) {
      const bal = await this.prisma.wallet.findFirst({
        where: { userId, currency: CURRENCY },
        select: { balance: true },
      });
      return {
        status: 'SUCCEEDED',
        amount: Number(existing.amount),
        currency: CURRENCY,
        balance: bal ? Number(bal.balance) : 0,
        idempotencyKey: idk,
      };
    }

    // Aplica crédito y registra Topup en una transacción atómica
    const balance = await this.prisma.$transaction(async (tx) => {
      const newBal = await this.wallet.credit(
        {
          userId,
          amount: new Decimal(dto.amount),
          reason: 'USER_TOPUP',
          idempotencyKey: idk,
          meta: { note: dto.note ?? null, actor: 'client-api' },
        },
        tx, // usa misma transacción
      );

      await tx.topup.create({
        data: {
          userId,
          amount: new Decimal(dto.amount),
          currency: CURRENCY as any,
          status: 'SUCCEEDED',
          provider: 'DIRECT',
          idempotencyKey: idk,
        },
      });

      return newBal;
    });

    return {
      status: 'SUCCEEDED',
      amount: dto.amount,
      currency: CURRENCY,
      balance: balance.toString(),
      idempotencyKey: idk,
    };
  }

  async listMyTopups(userId: string, page = 1, pageSize = 20) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.topup.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.topup.count({ where: { userId } }),
    ]);
    return {
      page,
      pageSize,
      total,
      items: items.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        currency: t.currency,
        status: t.status,
        provider: t.provider,
        createdAt: t.createdAt,
      })),
    };
  }
}
