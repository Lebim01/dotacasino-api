import { Injectable } from '@nestjs/common';
import { GetCasinoWeeklyPnlDto } from './dto/get-casino-weekly-pnl.dto';
import { DateTime } from 'luxon';
import { PrismaService } from 'libs/db/src/prisma.service';

// Tipos de apoyo para el shape que espera tu frontend
export type DetallePorUsuario = {
  login: string;
  apuestas: number;
  ganancias: number;
  neto: number;
  spins: number;
};

export type CasinoWeeklyUserDetailView = {
  id: string;
  level: number;
  percent: number;
  totalNeto: number;
  totalBonus: number;
  detallePorUsuario: DetallePorUsuario[];
  user: {
    id: string;
    name: string;
    email?: string | null;
  };
};

export type CasinoWeeklyReportView = {
  id: string;
  timezone: string;
  fromCDMX: Date;
  toCDMX: Date;
  createdAt: Date;
  totalPaid: number;
  userDetails: CasinoWeeklyUserDetailView[];

  // Campos globales del corte
  totalBets: number;
  totalWins: number;
  netLoss: number;
};

@Injectable()
export class ReportsCasinoService {
  constructor(private readonly prisma: PrismaService) {}

  private computePeriodCDMX(dto: GetCasinoWeeklyPnlDto) {
    const zone = dto.timezone || 'America/Mexico_City';

    if (dto.from && dto.to) {
      const start = DateTime.fromISO(dto.from, { zone }).startOf('day');
      const end = DateTime.fromISO(dto.to, { zone }).endOf('day');
      return { startUtc: start.toUTC(), endUtc: end.toUTC(), zone };
    }

    const now = DateTime.now().setZone(zone);

    const getSaturdayWeekStart = (ref: DateTime) => {
      const offset = (ref.weekday - 6 + 7) % 7;
      return ref.minus({ days: offset }).startOf('day');
    };

    if (dto.includeCurrentWeek) {
      const start = getSaturdayWeekStart(now);
      const end = now;
      return { startUtc: start.toUTC(), endUtc: end.toUTC(), zone };
    }

    const currentWeekStart = getSaturdayWeekStart(now);
    const start = currentWeekStart.minus({ weeks: 1 });
    const end = currentWeekStart.minus({ milliseconds: 1 });
    return { startUtc: start.toUTC(), endUtc: end.toUTC(), zone };
  }

  /**
   * Reporte semanal por login para "spin-game".
   * Agrupa por semana (CDMX) y usuario (meta->>'login').
   */
  async getCasinoWeeklyPnl(dto: GetCasinoWeeklyPnlDto) {
    const { startUtc, endUtc, zone } = this.computePeriodCDMX(dto);

    const rows = await this.prisma.$queryRaw<
      Array<{
        login: string | null;
        week_start_cdmx: Date;
        bets_sum: string;
        wins_sum: string;
        net_sum: string;
        spins: number;
      }>
    >`
      SELECT
        (meta->>'login') AS login,
        date_trunc('week', timezone(${zone}, "createdAt"))::date AS week_start_cdmx,
        COALESCE(SUM((meta->>'bet')::decimal), 0)  AS bets_sum,
        COALESCE(SUM((meta->>'win')::decimal), 0)  AS wins_sum,
        COALESCE(SUM(amount), 0)                   AS net_sum,
        COUNT(*)::int                              AS spins
      FROM "BetTicket"
      WHERE "createdAt" >= ${startUtc.toJSDate()}
        AND "createdAt" <= ${endUtc.toJSDate()}
      GROUP BY 1, 2
      ORDER BY 2 DESC, 1 ASC;
    `;

    const data = rows.map((r) => {
      const bets = Number(r.bets_sum);
      const wins = Number(r.wins_sum);
      const net = Number(r.net_sum);
      return {
        login: r.login ?? '—',
        weekStartCDMX: DateTime.fromJSDate(new Date(r.week_start_cdmx)).toISODate(),
        apuestas: Math.abs(bets),
        ganancias: wins,
        neto: net,
        estado: net > 0 ? 'GANANCIA' : net < 0 ? 'PÉRDIDA' : 'NEUTRO',
        spins: r.spins,
      };
    });

    const resumenPorSemana = Object.values(
      data.reduce((acc: Record<string, any>, row) => {
        const k = row.weekStartCDMX;
        if (k) {
          acc[k] ??= { weekStartCDMX: k, apuestas: 0, ganancias: 0, neto: 0 };
          acc[k].apuestas += row.apuestas;
          acc[k].ganancias += row.ganancias;
          acc[k].neto += row.neto;
        }
        return acc;
      }, {}),
    );

    return {
      timezone: zone,
      period: {
        fromCDMX: startUtc.setZone(zone).toISO(),
        toCDMX: endUtc.setZone(zone).toISO(),
      },
      resumenPorSemana,
      detallePorUsuario: data,
    };
  }

  /**
   * Mapea un CasinoWeeklyUserDetail de Prisma al tipo de vista.
   * El campo de relación en el schema se llama `User` (PascalCase).
   */
  private mapUserDetail(d: any): CasinoWeeklyUserDetailView {
    return {
      id: d.id,
      level: d.level,
      percent: d.percent,
      totalNeto: Number(d.totalNeto),
      totalBonus: Number(d.totalBonus),
      detallePorUsuario: (d.detallePorUsuario as unknown as DetallePorUsuario[]) ?? [],
      user: {
        id: d.User.id,
        name: d.User.displayName || '',
        email: d.User.email,
      },
    };
  }

  private computeReportTotals(userDetails: CasinoWeeklyUserDetailView[], deduplicateLogins = false) {
    let totalBets = 0;
    let totalWins = 0;
    const seenLogins = new Set<string>();

    for (const ud of userDetails) {
      for (const row of ud.detallePorUsuario) {
        if (deduplicateLogins) {
          if (seenLogins.has(row.login)) continue;
          seenLogins.add(row.login);
        }
        totalBets += row.apuestas || 0;
        totalWins += row.ganancias || 0;
      }
    }

    return { totalBets, totalWins, netLoss: totalBets - totalWins };
  }

  // ─────────────────────────────────────────────
  // 1) Historial global de cortes PAGADOS
  // ─────────────────────────────────────────────
  async getPaidReports(): Promise<CasinoWeeklyReportView[]> {
    const reports = await this.prisma.casinoWeeklyReport.findMany({
      orderBy: { fromCDMX: 'desc' },
      include: {
        CasinoWeeklyUserDetail: {
          include: {
            User: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return reports.map((report) => {
      const userDetails = report.CasinoWeeklyUserDetail.map((d) => this.mapUserDetail(d));
      const totalPaid = userDetails.reduce((sum, d) => sum + d.totalBonus, 0);
      const { totalBets, totalWins, netLoss } = this.computeReportTotals(userDetails, true);

      return {
        id: report.id,
        timezone: report.timezone,
        fromCDMX: report.fromCDMX,
        toCDMX: report.toCDMX,
        createdAt: report.createdAt,
        totalPaid,
        totalBets,
        totalWins,
        netLoss,
        userDetails,
      };
    });
  }

  // ─────────────────────────────────────────────
  // 2) Historial de cortes PAGADOS para un usuario concreto
  // ─────────────────────────────────────────────
  async getPaidReportsForUser(userId: string): Promise<CasinoWeeklyReportView[]> {
    const reports = await this.prisma.casinoWeeklyReport.findMany({
      where: {
        CasinoWeeklyUserDetail: {
          some: { userId },
        },
      },
      orderBy: { fromCDMX: 'desc' },
      include: {
        CasinoWeeklyUserDetail: {
          where: { userId },
          include: {
            User: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return reports.map((report) => {
      const userDetails = report.CasinoWeeklyUserDetail.map((d) => this.mapUserDetail(d));
      const totalPaid = userDetails.reduce((sum, d) => sum + d.totalBonus, 0);
      const { totalBets, totalWins, netLoss } = this.computeReportTotals(userDetails, false);

      return {
        id: report.id,
        timezone: report.timezone,
        fromCDMX: report.fromCDMX,
        toCDMX: report.toCDMX,
        createdAt: report.createdAt,
        totalPaid,
        totalBets,
        totalWins,
        netLoss,
        userDetails,
      };
    });
  }

  // ─────────────────────────────────────────────
  // 3) Detalle de un corte específico para un usuario
  // ─────────────────────────────────────────────
  async getReportByIdForUser(reportId: string, userId: string): Promise<CasinoWeeklyReportView | null> {
    const report = await this.prisma.casinoWeeklyReport.findUnique({
      where: { id: reportId },
      include: {
        CasinoWeeklyUserDetail: {
          where: { userId },
          include: {
            User: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!report) return null;

    const userDetails = report.CasinoWeeklyUserDetail.map((d) => this.mapUserDetail(d));
    const totalPaid = userDetails.reduce((sum, d) => sum + d.totalBonus, 0);
    const { totalBets, totalWins, netLoss } = this.computeReportTotals(userDetails, false);

    return {
      id: report.id,
      timezone: report.timezone,
      fromCDMX: report.fromCDMX,
      toCDMX: report.toCDMX,
      createdAt: report.createdAt,
      totalPaid,
      totalBets,
      totalWins,
      netLoss,
      userDetails,
    };
  }
}
