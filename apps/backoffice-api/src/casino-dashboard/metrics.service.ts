import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PrismaService } from 'libs/db/src/prisma.service';

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
    const whereCommon = toDateRange(range);

    const betPlace = await this.prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
      where: { kind: 'BET_PLACE', ...whereCommon },
    });
    const betWin = await this.prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
      where: { kind: 'BET_WIN', ...whereCommon },
    });

    const stakes = d(betPlace._sum.amount).abs(); // convertir negativos a valor apostado
    const payouts = d(betWin._sum.amount); // ya es positivo
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
}
