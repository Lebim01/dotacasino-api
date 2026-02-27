import { ForbiddenException, Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';

import { UserTopupDto } from './dto/user-topup.dto';
import { PrismaService } from 'libs/db/src/prisma.service';
import { WalletService } from '@domain/wallet/wallet.service';

@Injectable()
export class TopupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  async directTopup(userId: string, dto: UserTopupDto) {
    // Gate por entorno/flag para que no sea "dinero gratis" en prod.
    if (process.env.ENABLE_DIRECT_TOPUP !== 'true') {
      throw new ForbiddenException('Topup directo no habilitado');
    }

    const currency = await this.wallet.getUserWalletCurrency(userId);
    const idk = dto.idempotencyKey ?? `USER_TOPUP|${userId}|${Date.now()}`;

    // Idempotencia: si ya registramos ese topup, devolvemos el resultado previo
    const existing = await this.prisma.topup.findFirst({
      where: { idempotencyKey: idk, userId, status: 'SUCCEEDED' },
      select: { amount: true, createdAt: true },
    });

    if (existing) {
      const bal = await this.prisma.wallet.findFirst({
        where: { userId, currency },
        select: { balance: true },
      });
      return {
        status: 'SUCCEEDED',
        amount: Number(existing.amount),
        currency,
        balance: bal ? Number(bal.balance) : 0,
        idempotencyKey: idk,
      };
    }

    // Aplica credito y registra Topup en una transaccion atomica
    const balance = await this.prisma.$transaction(async (tx) => {
      const newBal = await this.wallet.credit(
        {
          userId,
          amount: new Decimal(dto.amount),
          reason: 'USER_TOPUP',
          idempotencyKey: idk,
          meta: { note: dto.note ?? null, actor: 'client-api' },
        },
        tx,
      );

      await tx.topup.create({
        data: {
          id: uuidv4(),
          userId,
          amount: new Decimal(dto.amount),
          currency,
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
      currency,
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
