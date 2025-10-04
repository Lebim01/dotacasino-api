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

export type DebitInput = {
  userId: string;
  amount: Decimal.Value; // > 0
  reason: string; // 'BET_PLACE' | 'WITHDRAW' | 'FEE' | ...
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
   * Helper: obtiene (o crea) la wallet del usuario en la moneda CURRENCY.
   * Puede usarse dentro o fuera de una transacción.
   */
  private async getOrCreateWallet(
    userId: string,
    db: Prisma.TransactionClient | PrismaService,
  ) {
    let wallet = await db.wallet.findFirst({
      where: { userId, currency: CURRENCY },
      select: { id: true, balance: true },
    });
    if (!wallet) {
      wallet = await db.wallet.create({
        data: { userId, currency: CURRENCY, balance: 0 },
        select: { id: true, balance: true },
      });
    }
    return wallet;
  }

  /**
   * Obtiene el balance actual de la wallet USD del usuario.
   * Si no existe, retorna 0 sin crearla (ajusta a tus necesidades).
   */
  async getBalance(userId: string): Promise<Decimal> {
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId, currency: CURRENCY },
      select: { balance: true },
    });
    return new Decimal(wallet?.balance ?? 0);
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

    const apply = async (client: Prisma.TransactionClient) => {
      const wallet = await this.getOrCreateWallet(input.userId, client);
      const newBal = new Decimal(wallet.balance).plus(amount);

      await client.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBal },
      });

      await client.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          kind: input.reason,
          amount, // positivo
          meta: input.meta ?? {},
          idempotencyKey: input.idempotencyKey ?? null,
          balanceAfter: newBal,
        },
      });

      return newBal;
    };

    if (tx) return apply(tx);
    return await this.prisma.$transaction(async (client) => apply(client));
  }

  /**
   * Resta saldo de la wallet USD del usuario (idempotente por idempotencyKey).
   * Valida fondos suficientes. Retorna el saldo final.
   */
  async debit(
    input: DebitInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Decimal> {
    const amount = new Decimal(input.amount);
    if (amount.lte(0)) throw new Error('El monto de débito debe ser > 0');

    const db = tx ?? this.prisma;

    // Idempotencia
    if (input.idempotencyKey) {
      const prev = await db.ledgerEntry.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        select: { balanceAfter: true },
      });
      if (prev?.balanceAfter != null) return new Decimal(prev.balanceAfter);
    }

    const apply = async (client: Prisma.TransactionClient) => {
      // Leemos siempre dentro de la tx para evitar estados obsoletos
      const wallet = await this.getOrCreateWallet(input.userId, client);

      const current = new Decimal(wallet.balance);
      if (current.lt(amount)) {
        throw new Error('Fondos insuficientes');
      }

      const newBal = current.minus(amount);

      await client.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBal },
      });

      // Guardamos el movimiento como monto negativo para claridad contable
      await client.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          kind: input.reason,
          amount: amount.negated(), // negativo
          meta: input.meta ?? {},
          idempotencyKey: input.idempotencyKey ?? null,
          balanceAfter: newBal,
        },
      });

      return newBal;
    };

    if (tx) return apply(tx);
    return await this.prisma.$transaction(async (client) => apply(client));
  }
}
