import { Injectable } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import { QueryLedgerDto } from './dto/query-ledger.dto';
import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';

@Injectable()
export class BetPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listEntries(q: QueryLedgerDto) {
    const take = Math.min(q.limit ?? 50, 200);
    const where: Prisma.LedgerEntryWhereInput = {
      walletId: q.walletId,
      createdAt: {
        gte: q.from ? new Date(q.from) : undefined,
        lte: q.to ? new Date(q.to) : undefined,
      },
    };

    return this.prisma.ledgerEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      cursor: q.cursor ? { id: q.cursor } : undefined,
      skip: q.cursor ? 1 : 0,
    });
  }

  // ========= Reportes para admin =========
  // 1) Resumen por tipo (y neto) en un rango
  async reportSummary({ from, to }: { from?: string; to?: string }) {
    const where: Prisma.LedgerEntryWhereInput = {
      createdAt: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      },
    };

    const rows = await this.prisma.ledgerEntry.groupBy({
      by: ['kind'],
      where,
      _sum: { amount: true },
    });

    const total = rows.reduce(
      (acc, r) => acc.add(new Decimal(r._sum.amount ?? 0)),
      new Decimal(0),
    );

    return {
      total: total.toFixed(), // neto (créditos - débitos)
      byKind: rows.map((r) => ({
        kind: r.kind,
        sum: new Decimal(r._sum.amount ?? 0).toFixed(),
      })),
    };
  }

  // 2) Serie diaria (por día y tipo), útil para gráficas
  async reportDaily({ from, to }: { from?: string; to?: string }) {
    // Prisma no agrupa por fecha truncada directamente; opción: raw SQL
    // Postgres: date_trunc('day', "createdAt")
    const params: any[] = [];
    let sql = `
      SELECT date_trunc('day', "createdAt")::date AS day,
             kind,
             SUM(amount) AS sum
      FROM "LedgerEntry"
      WHERE 1=1
    `;
    if (from) {
      params.push(from);
      sql += ` AND "createdAt" >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      sql += ` AND "createdAt" <= $${params.length}`;
    }
    sql += ` GROUP BY day, kind ORDER BY day ASC;`;

    const rows = await this.prisma.$queryRawUnsafe<any[]>(sql, ...params);

    // Estructura { day: YYYY-MM-DD, totals: { kind: sum, ... }, net: total }
    const map = new Map<
      string,
      { day: string; totals: Record<string, string>; net: Decimal }
    >();
    for (const r of rows) {
      const day =
        r.day instanceof Date
          ? r.day.toISOString().slice(0, 10)
          : String(r.day);
      const sum = new Decimal(r.sum ?? 0);
      const entry = map.get(day) ?? { day, totals: {}, net: new Decimal(0) };
      entry.totals[r.kind] = sum.toFixed();
      entry.net = entry.net.add(sum);
      map.set(day, entry);
    }

    return Array.from(map.values())
      .sort((a, b) => a.day.localeCompare(b.day))
      .map((x) => ({
        ...x,
        net: x.net.toFixed(),
      }));
  }
}
