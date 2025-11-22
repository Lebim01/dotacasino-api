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

  // NUEVOS CAMPOS GLOBALES DEL CORTE
  totalBets: number; // monto total apostado por todos los jugadores
  totalWins: number; // monto total ganado por todos los jugadores
  netLoss: number; // pérdidas netas de los jugadores (casino = ganancia)
};

@Injectable()
export class ReportsCasinoService {
  constructor(private readonly prisma: PrismaService) {}

  private computePeriodCDMX(dto: GetCasinoWeeklyPnlDto) {
    const zone = dto.timezone || 'America/Mexico_City';

    // Si viene rango explícito (YYYY-MM-DD) interpretado en CDMX:
    if (dto.from && dto.to) {
      const start = DateTime.fromISO(dto.from, { zone }).startOf('day');
      const end = DateTime.fromISO(dto.to, { zone }).endOf('day');
      return { startUtc: start.toUTC(), endUtc: end.toUTC(), zone };
    }

    // Si no viene rango, sacamos semana:
    // - por defecto: semana COMPLETA ANTERIOR (sábado 00:00 a viernes 23:59:59.999) en CDMX
    // - si includeCurrentWeek=true: semana actual (parcial, de sábado 00:00 al momento actual) en CDMX
    const now = DateTime.now().setZone(zone);

    // Helper: inicio de semana basada en sábado
    const getSaturdayWeekStart = (ref: DateTime) => {
      // Luxon: weekday -> 1 = lunes ... 7 = domingo
      // Queremos ir hacia atrás hasta el SÁBADO (weekday = 6)
      const offset = (ref.weekday - 6 + 7) % 7; // días hacia atrás hasta el sábado
      return ref.minus({ days: offset }).startOf('day');
    };

    if (dto.includeCurrentWeek) {
      // Semana actual (parcial), de sábado a ahora
      const start = getSaturdayWeekStart(now);
      const end = now;
      return { startUtc: start.toUTC(), endUtc: end.toUTC(), zone };
    }

    // Semana anterior completa (sábado a viernes)
    const currentWeekStart = getSaturdayWeekStart(now);
    const start = currentWeekStart.minus({ weeks: 1 }); // sábado anterior 00:00
    const end = currentWeekStart.minus({ milliseconds: 1 }); // viernes 23:59:59.999
    return { startUtc: start.toUTC(), endUtc: end.toUTC(), zone };
  }

  /**
   * Reporte semanal por login para "spin-game".
   * Agrupa por semana (CDMX) y usuario (meta->>'login').
   */
  async getCasinoWeeklyPnl(dto: GetCasinoWeeklyPnlDto) {
    const { startUtc, endUtc, zone } = this.computePeriodCDMX(dto);

    // Nota: amount ya viene con signo (BET negativo, WIN positivo).
    // Aun así, separamos apuestas/ganancias por meta->>'action' para KPIs.
    const rows = await this.prisma.$queryRaw<
      Array<{
        login: string | null;
        week_start_cdmx: Date; // inicio de semana en CDMX (fecha)
        bets_sum: string; // NUMERIC como string
        wins_sum: string; // NUMERIC como string
        net_sum: string; // NUMERIC como string
        spins: number;
      }>
    >`
      SELECT
        (meta->>'login') AS login,
        date_trunc('week', timezone(${zone}, "createdAt"))::date AS week_start_cdmx,
        COALESCE(SUM((meta->>'bet')::decimal), 0)  AS bets_sum,
        COALESCE(SUM((meta->>'win')::decimal), 0)  AS wins_sum,
        COALESCE(SUM(amount), 0)                                                    AS net_sum,
        COUNT(*)::int                                                               AS spins
      FROM "LedgerEntry"
      WHERE kind = 'spin-game'
        AND "createdAt" >= ${startUtc.toJSDate()}
        AND "createdAt" <= ${endUtc.toJSDate()}
      GROUP BY 1, 2
      ORDER BY 2 DESC, 1 ASC;
    `;

    // Normalizamos a salida amigable
    const data = rows.map((r) => {
      const bets = Number(r.bets_sum); // negativo
      const wins = Number(r.wins_sum); // positivo
      const net = Number(r.net_sum); // wins + bets
      return {
        login: r.login ?? '—',
        weekStartCDMX: DateTime.fromJSDate(
          new Date(r.week_start_cdmx),
        ).toISODate(),
        apuestas: Math.abs(bets), // monto apostado (positivo)
        ganancias: wins,
        neto: net,
        estado: net > 0 ? 'GANANCIA' : net < 0 ? 'PÉRDIDA' : 'NEUTRO',
        spins: r.spins,
      };
    });

    // Totalizadores por semana (opcional)
    const resumenPorSemana = Object.values(
      data.reduce((acc, row) => {
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

  // ─────────────────────────────────────────────
  // 1) Historial global de cortes PAGADOS
  // ─────────────────────────────────────────────
  async getPaidReports(): Promise<CasinoWeeklyReportView[]> {
    const reports = await this.prisma.casinoWeeklyReport.findMany({
      orderBy: {
        fromCDMX: 'desc',
      },
      include: {
        userDetails: {
          include: {
            user: {
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
      const userDetails: CasinoWeeklyUserDetailView[] = report.userDetails.map(
        (d) => ({
          id: d.id,
          level: d.level,
          percent: d.percent,
          totalNeto: Number(d.totalNeto),
          totalBonus: Number(d.totalBonus),
          detallePorUsuario:
            (d.detallePorUsuario as unknown as DetallePorUsuario[]) ?? [],
          user: {
            id: d.user.id,
            name: d.user.displayName || '',
            email: d.user.email,
          },
        }),
      );

      const totalPaid = userDetails.reduce((sum, d) => sum + d.totalBonus, 0);

      // NUEVO: calcular totales globales del corte
      let totalBets = 0;
      let totalWins = 0;

      // Para no duplicar montos por jugador cuando aparece en varios userDetails
      const seenLogins = new Set<string>();

      for (const ud of userDetails) {
        for (const row of ud.detallePorUsuario) {
          if (seenLogins.has(row.login)) {
            continue; // ya contamos a este jugador
          }

          seenLogins.add(row.login);

          totalBets += row.apuestas || 0;
          totalWins += row.ganancias || 0;
        }
      }

      const netLoss = totalBets - totalWins; // si > 0, los jugadores perdieron en total

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
  //    (totales calculados solo sobre SUS detalles)
  // ─────────────────────────────────────────────
  async getPaidReportsForUser(
    userId: string,
  ): Promise<CasinoWeeklyReportView[]> {
    const reports = await this.prisma.casinoWeeklyReport.findMany({
      where: {
        userDetails: {
          some: {
            userId,
          },
        },
      },
      orderBy: {
        fromCDMX: 'desc',
      },
      include: {
        userDetails: {
          where: {
            userId,
          },
          include: {
            user: {
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
      const userDetails: CasinoWeeklyUserDetailView[] = report.userDetails.map(
        (d) => ({
          id: d.id,
          level: d.level,
          percent: d.percent,
          totalNeto: Number(d.totalNeto),
          totalBonus: Number(d.totalBonus),
          detallePorUsuario:
            (d.detallePorUsuario as unknown as DetallePorUsuario[]) ?? [],
          user: {
            id: d.user.id,
            name: d.user.displayName || '',
            email: d.user.email,
          },
        }),
      );

      const totalPaid = userDetails.reduce((sum, d) => sum + d.totalBonus, 0);

      // Totales solo de la parte que ve este usuario (su propia red)
      let totalBets = 0;
      let totalWins = 0;

      for (const ud of userDetails) {
        for (const row of ud.detallePorUsuario) {
          totalBets += row.apuestas || 0;
          totalWins += row.ganancias || 0;
        }
      }

      const netLoss = totalBets - totalWins;

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
  async getReportByIdForUser(
    reportId: string,
    userId: string,
  ): Promise<CasinoWeeklyReportView | null> {
    const report = await this.prisma.casinoWeeklyReport.findUnique({
      where: { id: reportId },
      include: {
        userDetails: {
          where: { userId },
          include: {
            user: {
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

    const userDetails: CasinoWeeklyUserDetailView[] = report.userDetails.map(
      (d) => ({
        id: d.id,
        level: d.level,
        percent: d.percent,
        totalNeto: Number(d.totalNeto),
        totalBonus: Number(d.totalBonus),
        detallePorUsuario:
          (d.detallePorUsuario as unknown as DetallePorUsuario[]) ?? [],
        user: {
          id: d.user.id,
          name: d.user.displayName || '',
          email: d.user.email,
        },
      }),
    );

    const totalPaid = userDetails.reduce((sum, d) => sum + d.totalBonus, 0);

    let totalBets = 0;
    let totalWins = 0;

    for (const ud of userDetails) {
      for (const row of ud.detallePorUsuario) {
        totalBets += row.apuestas || 0;
        totalWins += row.ganancias || 0;
      }
    }

    const netLoss = totalBets - totalWins;

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
