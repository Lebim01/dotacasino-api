import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Currency } from '@prisma/client';
import { PrismaService } from 'libs/db/src/prisma.service';
import { resolveCurrencyByCountry } from 'libs/shared/src/currency';
import Decimal from 'decimal.js';

export type CreditInput = {
  userId: string;
  amount: Decimal.Value; // > 0
  currency?: Currency;
  reason: string; // 'TOPUP' | 'BET_WIN' | 'REFUND' | ...
  meta?: Record<string, any>;
  idempotencyKey?: string; // evita duplicados
};

export type DebitInput = {
  userId: string;
  amount: Decimal.Value; // > 0
  currency?: Currency;
  reason: string; // 'BET_PLACE' | 'WITHDRAW' | 'FEE' | ...
  meta?: Record<string, any>;
  idempotencyKey?: string; // evita duplicados
  tid?: string; // evita duplicados
};

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name, {
    timestamp: true,
  });
  private readonly walletIdCache = new Map<string, string>(); // userId:currency -> walletId cache

  constructor(private readonly prisma: PrismaService) {}

  private cacheKey(userId: string, currency: Currency) {
    return `${userId}:${currency}`;
  }

  async getUserWalletCurrency(
    userId: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<Currency> {
    const user = await client.user.findUnique({
      where: { id: userId },
      select: { country: true },
    });

    return resolveCurrencyByCountry(user?.country ?? null);
  }

  async createWallet(userId: string, country?: string) {
    const currency = country
      ? resolveCurrencyByCountry(country)
      : await this.getUserWalletCurrency(userId);

    return this.prisma.wallet.upsert({
      where: { userId_currency: { userId, currency } },
      update: {},
      create: { userId, currency, balance: 0 },
    });
  }

  /**
   * Helper: obtiene (o crea) la wallet del usuario en su moneda local.
   * Puede usarse dentro o fuera de una transacción.
   */
  private async getOrCreateWallet(
    userId: string,
    client: Prisma.TransactionClient | PrismaService,
    currency?: Currency,
  ) {
    const walletCurrency =
      currency ?? (await this.getUserWalletCurrency(userId, client));
    const cacheKey = this.cacheKey(userId, walletCurrency);

    // 1. Intentar obtener el ID desde el cache para evitar busquedas complejas
    const cachedId = this.walletIdCache.get(cacheKey);

    if (cachedId) {
      // El findUnique por ID (Primary Key) es casi instantaneo en Postgres
      const wallet = await client.wallet.findUnique({
        where: { id: cachedId },
        select: { id: true, balance: true, currency: true },
      });
      if (wallet) return wallet;
    }

    // 2. Si no hay cache o no se encontro, usar upsert atomico (1 solo round-trip a la DB)
    const wallet = await client.wallet.upsert({
      where: { userId_currency: { userId, currency: walletCurrency } },
      update: {}, // No cambiamos nada si ya existe
      create: { userId, currency: walletCurrency, balance: 0 },
      select: { id: true, balance: true, currency: true },
    });

    // 3. Poblar cache para futuras peticiones
    this.walletIdCache.set(cacheKey, wallet.id);

    return wallet;
  }

  /**
   * Obtiene el balance actual de la wallet local del usuario.
   * Si no existe, retorna 0 sin crearla (ajusta a tus necesidades).
   */
  async getBalance(userId: string, currency?: Currency): Promise<Decimal> {
    const targetCurrency = currency ?? (await this.getUserWalletCurrency(userId));
    const cacheKey = this.cacheKey(userId, targetCurrency);
    const cachedId = this.walletIdCache.get(cacheKey);

    if (cachedId) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { id: cachedId },
        select: { balance: true },
      });
      return new Decimal(wallet?.balance ?? 0);
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency: targetCurrency } },
      select: { id: true, balance: true, currency: true },
    });

    if (wallet) {
      this.walletIdCache.set(cacheKey, wallet.id);
    }

    return new Decimal(wallet?.balance ?? 0);
  }

  /**
   * Agrega credito a la wallet local del usuario (idempotente por idempotencyKey).
   * Retorna el saldo final.
   */
  async credit(
    input: CreditInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Decimal> {
    const amount = new Decimal(input.amount);
    if (amount.lte(0)) throw new Error('El monto de credito debe ser > 0');

    const apply = async (client: Prisma.TransactionClient) => {
      const wallet = await this.getOrCreateWallet(
        input.userId,
        client,
        input.currency,
      );
      const newBal = new Decimal(wallet.balance).plus(amount);

      await Promise.all([
        // update wallet new bal
        client.wallet.update({
          where: { id: wallet.id },
          data: { balance: newBal },
        }),
        // create ledger entry
        client.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            currency: wallet.currency,
            kind: input.reason,
            amount, // positivo
            meta: input.meta ?? {},
            idempotencyKey: input.idempotencyKey ?? null,
            balanceAfter: newBal,
          },
        }),
      ]);

      return newBal;
    };

    if (tx) return apply(tx);
    return await this.prisma.$transaction(async (client) => apply(client));
  }

  /**
   * Resta saldo de la wallet local del usuario (idempotente por idempotencyKey).
   * Valida fondos suficientes. Retorna el saldo final.
   */
  async debit(
    input: DebitInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Decimal> {
    const amount = new Decimal(input.amount);
    if (amount.lte(0)) throw new Error('El monto de debito debe ser > 0');

    const apply = async (client: Prisma.TransactionClient) => {
      const wallet = await this.getOrCreateWallet(
        input.userId,
        client,
        input.currency,
      );

      const current = new Decimal(wallet.balance);
      if (current.lt(amount)) {
        throw new Error('Fondos insuficientes');
      }

      const newBal = current.minus(amount);

      // 2. Transaccion de DB: Solo operaciones SQL (muy rapidas)
      await Promise.all([
        client.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: amount } },
        }),
        client.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            currency: wallet.currency,
            kind: input.reason,
            amount: amount.negated(),
            meta: input.meta ?? {},
            idempotencyKey: input.idempotencyKey ?? null,
            balanceAfter: newBal,
            tid: input.tid?.toString() ?? null,
          },
        }),
      ]);

      return newBal;
    };

    const finalBal = tx
      ? await apply(tx)
      : await this.prisma.$transaction(async (client) => apply(client));

    return finalBal;
  }


  async getPendingAmount(user_id: string) {
    const payment = await this.prisma.nodePayment.findFirst({
      where: {
        userId: user_id,
        type: 'casino',
        category: 'withdraw',
        status: 'pending'
      }
    });
    return payment ? Number(payment.amount) : 0;
  }
}
