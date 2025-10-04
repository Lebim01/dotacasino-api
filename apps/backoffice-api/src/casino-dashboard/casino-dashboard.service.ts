import { Injectable } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import { QueryLedgerDto } from './dto/query-ledger.dto';
import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';

// ------- helpers rango -------
type Range = { from?: string; to?: string };
type RangeWithLimit = Range & { limit: number };

export function normalizeRange({ from, to }: Range): { from: Date; to: Date } {
  const now = new Date();
  const toDate = to ? new Date(to) : now;
  // por defecto últimos 30 días
  const fromDate = from
    ? new Date(from)
    : new Date(toDate.getTime() - 29 * 24 * 60 * 60 * 1000);
  // normaliza a medianoche para buckets diarios
  const f = new Date(
    Date.UTC(
      fromDate.getUTCFullYear(),
      fromDate.getUTCMonth(),
      fromDate.getUTCDate(),
      0,
      0,
      0,
    ),
  );
  const t = new Date(
    Date.UTC(
      toDate.getUTCFullYear(),
      toDate.getUTCMonth(),
      toDate.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
  return { from: f, to: t };
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function fillDailySeries(
  from: Date,
  to: Date,
  map: Record<string, Decimal | number | null>,
) {
  const days: { date: string; value: number }[] = [];
  for (
    let cur = new Date(from);
    cur <= to;
    cur = new Date(cur.getTime() + 86400000)
  ) {
    const key = dateKey(cur);
    const v = map[key] ?? 0;
    const num = v instanceof Decimal ? v.toNumber() : Number(v || 0);
    days.push({ date: key, value: num });
  }
  return days;
}

@Injectable()
export class CasinoDashboardService {
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

  // 1) Serie diaria: Apuestas (stakes) vs Premios (payouts)
  async getDailyBetsVsPayouts(range: Range) {
    const { from, to } = normalizeRange(range);

    // BET_PLACE por día
    const betPlaceRows: Array<{ day: string; sum: string | number | null }> =
      await this.prisma.$queryRawUnsafe(
        `
         SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day,
              SUM(
                CASE
                  WHEN (meta->>'bet') ~ '^-?\d+(\.\d+)?$' THEN (meta->>'bet')::numeric
                  ELSE 0
                END
              ) AS sum_win
        FROM "LedgerEntry"
        WHERE "kind" = 'spin-game'
          AND "createdAt" BETWEEN $1 AND $2
        GROUP BY 1
        ORDER BY 1
      `,
        from,
        to,
      );

    // BET_WIN por día
    const betWinRows: Array<{ day: string; sum: string | number | null }> =
      await this.prisma.$queryRawUnsafe(
        `
        SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day,
          SUM(
            CASE
              WHEN (meta->>'win') ~ '^-?\d+(\.\d+)?$' THEN (meta->>'win')::numeric
              ELSE 0
            END
          ) AS sum_win
        FROM "LedgerEntry"
        WHERE "kind" = 'spin-game'
          AND "createdAt" BETWEEN $1 AND $2
        GROUP BY 1
        ORDER BY 1
      `,
        from,
        to,
      );

    const stakesMap: Record<string, Decimal> = {};
    const payoutsMap: Record<string, Decimal> = {};

    for (const r of betPlaceRows) {
      // BET_PLACE viene negativo: usamos su valor absoluto como "apuestas"
      stakesMap[r.day] = new Decimal(r.sum || 0).abs();
    }
    for (const r of betWinRows) {
      payoutsMap[r.day] = new Decimal(r.sum || 0);
    }

    const stakes = fillDailySeries(from, to, stakesMap);
    const payouts = fillDailySeries(from, to, payoutsMap);

    return { from: from.toISOString(), to: to.toISOString(), stakes, payouts };
  }

  // 2) Top juegos por rondas (tickets) y por volumen (suma stake)
  async getTopGames({ from, to, limit }: RangeWithLimit) {
    const norm = normalizeRange({ from, to });

    // Rondas (conteo de BetTicket)
    const rounds: Array<{ gameId: string; title: string; rounds: number }> =
      await this.prisma.$queryRawUnsafe(
        `
        SELECT t."gameId" AS "gameId",
               COALESCE(g."title", 'Unknown') AS "title",
               COUNT(*)::int AS rounds
        FROM "BetTicket" t
        LEFT JOIN "Game" g ON g."betId" = t."gameId"
        WHERE t."createdAt" BETWEEN $1 AND $2
        GROUP BY t."gameId", g."title"
        ORDER BY rounds DESC
        LIMIT $3;
      `,
        norm.from,
        norm.to,
        limit,
      );

    // Volumen (suma stake en BetTicket)
    const volume: Array<{ gameId: string; title: string; volume: string }> =
      await this.prisma.$queryRawUnsafe(
        `
        SELECT t."gameId" AS "gameId",
               COALESCE(g."title", 'Unknown') AS "title",
               COALESCE(SUM(t."stake"), 0)::text AS volume
        FROM "BetTicket" t
        LEFT JOIN "Game" g ON g."betId" = t."gameId"
        WHERE t."createdAt" BETWEEN $1 AND $2
        GROUP BY t."gameId", g."title"
        ORDER BY SUM(t."stake") DESC
        LIMIT $3;
      `,
        norm.from,
        norm.to,
        limit,
      );

    return {
      from: norm.from.toISOString(),
      to: norm.to.toISOString(),
      limit,
      byRounds: rounds.map((r) => ({
        gameId: r.gameId,
        title: r.title,
        rounds: r.rounds,
      })),
      byVolume: volume.map((v) => ({
        gameId: v.gameId,
        title: v.title,
        volume: new Decimal(v.volume || 0).toNumber(),
      })),
    };
  }

  // 3) Tendencia diaria: Depósitos vs Retiros vs GGR
  async getDailyTrend(range: Range) {
    const { from, to } = normalizeRange(range);

    // Depósitos (Topup SUCCEEDED)
    const depRows: Array<{ day: string; sum: string | number | null }> =
      await this.prisma.$queryRawUnsafe(
        `
        SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day,
               SUM("amount") AS sum
        FROM "Topup"
        WHERE "status" = 'SUCCEEDED'
          AND "createdAt" BETWEEN $1 AND $2
        GROUP BY 1
        ORDER BY 1;
      `,
        from,
        to,
      );

    // Retiros (Ledger WITHDRAWAL) — reportar como positivo
    const witRows: Array<{ day: string; sum: string | number | null }> =
      await this.prisma.$queryRawUnsafe(
        `
        SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day,
               SUM("amount") AS sum
        FROM "LedgerEntry"
        WHERE "kind" = 'WITHDRAWAL'
          AND "createdAt" BETWEEN $1 AND $2
        GROUP BY 1
        ORDER BY 1;
      `,
        from,
        to,
      );

    // BET_PLACE y BET_WIN para GGR
    const stakeRows: Array<{ day: string; sum: string | number | null }> =
      await this.prisma.$queryRawUnsafe(
        `
        SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day,
              SUM(
                CASE
                  WHEN (meta->>'bet') ~ '^-?\d+(\.\d+)?$' THEN (meta->>'bet')::numeric
                  ELSE 0
                END
              ) AS sum
        FROM "LedgerEntry"
        WHERE "kind" = 'spin-game'
          AND "createdAt" BETWEEN $1 AND $2
        GROUP BY 1
        ORDER BY 1;
      `,
        from,
        to,
      );

    const payoutRows: Array<{ day: string; sum: string | number | null }> =
      await this.prisma.$queryRawUnsafe(
        `
        SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day,
              SUM(
                CASE
                  WHEN (meta->>'win') ~ '^-?\d+(\.\d+)?$' THEN (meta->>'win')::numeric
                  ELSE 0
                END
              ) AS sum
        FROM "LedgerEntry"
        WHERE "kind" = 'spin-game'
          AND "createdAt" BETWEEN $1 AND $2
        GROUP BY 1
        ORDER BY 1;
      `,
        from,
        to,
      );

    const depMap: Record<string, Decimal> = {};
    const witMap: Record<string, Decimal> = {};
    const ggrMap: Record<string, Decimal> = {};

    for (const r of depRows) depMap[r.day] = new Decimal(r.sum || 0);
    for (const r of witRows) witMap[r.day] = new Decimal(r.sum || 0).abs(); // valor positivo para reporte

    // Construye GGR diario
    const stakeMap: Record<string, Decimal> = {};
    const payoutMap: Record<string, Decimal> = {};
    for (const r of stakeRows) stakeMap[r.day] = new Decimal(r.sum || 0).abs(); // apuesta del día (positivo)
    for (const r of payoutRows) payoutMap[r.day] = new Decimal(r.sum || 0); // premios del día

    // Fusiona fechas y calcula ggr = stakes - payouts
    const allDays = new Set<string>([
      ...Object.keys(stakeMap),
      ...Object.keys(payoutMap),
    ]);
    for (const key of allDays) {
      const s = stakeMap[key] || new Decimal(0);
      const p = payoutMap[key] || new Decimal(0);
      ggrMap[key] = s.minus(p);
    }

    const deposits = fillDailySeries(from, to, depMap);
    const withdrawals = fillDailySeries(from, to, witMap);
    const ggr = fillDailySeries(from, to, ggrMap);

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      deposits,
      withdrawals,
      ggr,
    };
  }
}
