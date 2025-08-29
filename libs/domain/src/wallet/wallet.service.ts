import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';
import { PrismaService } from 'libs/db/src/prisma.service';
import { CURRENCY } from 'libs/shared/src/currency';

export type CreditInput = {
  userId: string;
  amount: Decimal.Value; // > 0
  reason: string; // 'TOPUP' | 'BET_WIN' | 'REFUND' | ...
  meta?: Record<string, any>;
  idempotencyKey?: string; // evita duplicados
};

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async createWallet(userId: string) {
    try {
      return await this.prisma.wallet.create({
        data: { userId, currency: 'USD' },
      });
    } catch (err: any) {
      throw err;
    }
  }

  /**
   * Agrega crédito a la wallet USD del usuario (idempotente por idempotencyKey).
   * Retorna el saldo final.
   */
  async credit(
    input: CreditInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Decimal> {
    const amount = new Decimal(input.amount);
    if (amount.lte(0)) throw new Error('El monto de crédito debe ser > 0');

    const db = tx ?? this.prisma;

    // Idempotencia
    if (input.idempotencyKey) {
      const prev = await db.ledgerEntry.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        select: { balanceAfter: true },
      });
      if (prev?.balanceAfter != null) return new Decimal(prev.balanceAfter);
    }

    // Busca o crea la wallet USD
    let wallet = await db.wallet.findFirst({
      where: { userId: input.userId, currency: CURRENCY },
      select: { id: true, balance: true },
    });
    if (!wallet) {
      wallet = await db.wallet.create({
        data: { userId: input.userId, currency: CURRENCY, balance: 0 },
        select: { id: true, balance: true },
      });
    }

    // Si nos pasan una tx externa, actuamos dentro de esa tx
    const apply = async (client: Prisma.TransactionClient) => {
      const newBal = new Decimal(wallet!.balance).plus(amount);
      await client.wallet.update({
        where: { id: wallet!.id },
        data: { balance: newBal },
      });
      await client.ledgerEntry.create({
        data: {
          walletId: wallet!.id,
          kind: input.reason,
          amount,
          meta: input.meta ?? {},
          idempotencyKey: input.idempotencyKey ?? null,
          balanceAfter: newBal,
        },
      });
      return newBal;
    };

    if (tx) return apply(tx);

    // Transacción propia
    const newBalance = await this.prisma.$transaction(async (client) =>
      apply(client),
    );
    return newBalance;
  }
}
