import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PrismaService } from 'libs/db/src/prisma.service';
import { normalizeRange } from './casino-dashboard.service';

type Range = { from?: string; to?: string };
type HoursWindow = { hours: number };

function toDateRange({ from, to }: Range) {
  const where: any = {};
  if (from || to) {
    where.gte = from ? new Date(from) : undefined;
    where.lte = to ? new Date(to) : undefined;
    return { createdAt: where };
  }
  return {}; // sin filtro de fechas
}

/**
 * Helpers para tratar sumas que pueden venir null de Prisma.
 */
function d(v: any): Decimal {
  if (!v) return new Decimal(0);
  try {
    return new Decimal(v);
  } catch {
    return new Decimal(0);
  }
}

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Total de depósitos confirmados (Topup SUCCEEDED) en el rango. */
  async getTotalDeposits(range: Range) {
    const where = {
      status: 'SUCCEEDED',
      ...toDateRange(range),
    };
    const res = await this.prisma.topup.aggregate({
      _sum: { amount: true },
      where,
    });
    const total = d(res._sum.amount);
    return { total: total.toNumber() };
  }

  /** Total de retiros (Ledger kind=WITHDRAWAL). Se reporta en positivo. */
  async getTotalWithdrawals(range: Range) {
    const where = {
      kind: 'WITHDRAWAL',
      ...toDateRange(range),
    };
    const res = await this.prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
      where,
    });
    // En tu modelo, los retiros son débitos (montos negativos).
    const sum = d(res._sum.amount); // típico: negativo
    const total = sum.abs();
    return { total: total.toNumber() };
  }

  /** Jugadores activos en la última ventana (por defecto 24h) por BetTicket. */
  async getActivePlayers({ hours }: HoursWindow) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    // Distinct userId con al menos un ticket en la ventana
    const rows = await this.prisma.betTicket.findMany({
      where: { createdAt: { gte: since } },
      select: { userId: true },
      distinct: ['userId'],
    });
    return { count: rows.length };
  }

  /**
   * GGR (ganancia bruta): stakes - payouts
   * - stakes: ABS(suma amount de BET_PLACE)  (son negativos en el wallet del usuario)
   * - payouts: suma amount de BET_WIN        (positivos)
   * Resultado = stakes - payouts
   */
  async getGrossProfit(range: Range) {
    const { from, to } = normalizeRange(range);

    const res: any[] = await this.prisma.$queryRawUnsafe(
      `
        SELECT 
          SUM((meta->>'bet')::numeric) AS sum_bet,
          SUM((meta->>'win')::numeric) AS sum_win
        FROM "LedgerEntry"
        WHERE "kind" = 'spin-game'
          AND "createdAt" BETWEEN $1 AND $2
      `,
      from,
      to,
    );

    const stakes = d(res[0].sum_bet).abs(); // convertir negativos a valor apostado
    const payouts = d(res[0].sum_win); // ya es positivo
    const ggr = stakes.minus(payouts); // GGR = stakes - payouts

    return {
      stakes: stakes.toNumber(),
      payouts: payouts.toNumber(),
      ggr: ggr.toNumber(),
    };
  }

  /**
   * Ganancia neta: GGR + fees
   * - fees: si `FEE` se registra como monto negativo (cargo al usuario),
   *         ingresos por fees = -sum(FEE).
   */
  async getNetProfit(range: Range) {
    const gross = await this.getGrossProfit(range);

    const feeAgg = await this.prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
      where: { kind: 'FEE', ...toDateRange(range) },
    });

    const sumFees = d(feeAgg._sum.amount); // típico: negativo
    const feesRevenue = sumFees.negated(); // -(-X) = +X
    const net = d(gross.ggr).plus(feesRevenue);

    return {
      ...gross,
      feesRevenue: feesRevenue.toNumber(),
      net: net.toNumber(),
    };
  }

  /**
   * Resumen global:
   * - totalBalance: suma de todas las wallets
   * - walletsCount: número de wallets
   * - usersCount: usuarios únicos con wallet
   * - avgPerWallet
   * - avgPerUser (promedio del total por usuario)
   */
  async getSummary() {
    const agg = await this.prisma.wallet.aggregate({
      _sum: { balance: true },
      _count: { _all: true },
    });

    // groupBy por usuario para calcular usuarios únicos y promedio por usuario
    const perUser = await this.prisma.wallet.groupBy({
      by: ['userId'],
      _sum: { balance: true },
    });

    const usersCount = perUser.length;
    const totalBalance = d(agg._sum.balance).toNumber();
    const walletsCount = agg._count._all;

    const avgPerWallet = walletsCount
      ? d(totalBalance).div(walletsCount).toNumber()
      : 0;
    const sumPerUser = perUser.reduce(
      (acc, r) => acc.plus(d(r._sum.balance)),
      new Decimal(0),
    );
    const avgPerUser = usersCount ? sumPerUser.div(usersCount).toNumber() : 0;

    return {
      totalBalance,
      walletsCount,
      usersCount,
      avgPerWallet,
      avgPerUser,
    };
  }

  /**
   * Top N usuarios por saldo total (suma de todas sus wallets).
   * Une con tabla User para mostrar email/nombre.
   */
  async getTopHolders({ limit }: { limit: number }) {
    // 1) groupBy userId
    const groups = await this.prisma.wallet.groupBy({
      by: ['userId'],
      _sum: { balance: true },
      orderBy: { _sum: { balance: 'desc' } },
      take: limit,
    });

    const userIds = groups.map((g) => g.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
      },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return groups.map((g) => {
      const u = userMap.get(g.userId);
      return {
        userId: g.userId,
        total: d(g._sum.balance).toNumber(),
        user: u
          ? {
              email: u.email,
              name:
                u.displayName ||
                [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
                null,
            }
          : null,
      };
    });
  }
}
