import { Injectable } from '@nestjs/common';
import { GetCasinoWeeklyPnlDto } from './dto/get-casino-weekly-pnl.dto';
import { DateTime } from 'luxon';
import { PrismaService } from 'libs/db/src/prisma.service';

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
}
