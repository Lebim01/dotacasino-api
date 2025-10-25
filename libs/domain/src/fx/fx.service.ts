import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

/**
 * FxService — obtiene USD/MXN (FIX) desde Banxico (SIE API).
 * - Serie: SF43718 (Pesos por Dólar. FIX)
 * - Retorna cuántos MXN cuesta 1 USD (USD/MXN)
 */
@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name);
  private readonly SERIES_FIX = 'SF43718';

  constructor(
    private readonly http: HttpService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /**
   * Rate actual (dato oportuno). Si no hay (fin de semana/feriado),
   * hace fallback a últimos 7 días y toma el último dato disponible.
   */
  async getUsdMxn(): Promise<number> {
    const cacheKey = 'fx:usdmxn:fix';
    const cached = await this.cache.get<number>(cacheKey);
    if (cached && cached > 0) return cached;

    // 1) Intento "dato oportuno"
    const latest = await this.fetchLatestFix().catch((e) => {
      this.logger.warn(`Banxico oportuno no disponible: ${e?.message ?? e}`);
      return null;
    });

    let rate = latest;

    // 2) Fallback: consulta rango últimos 7 días y toma el último dato no vacío
    if (!rate) {
      const from = this.shiftBusinessDays(7); // hoy-7d (incluye buffer)
      const to = this.formatDate(new Date());
      rate = await this.fetchFixRange(from, to).catch((e) => {
        this.logger.error(`Banxico rango falló: ${e?.message ?? e}`);
        return null;
      });
    }

    if (!rate || isNaN(rate) || rate <= 0) {
      throw new Error(
        'No fue posible obtener el tipo de cambio USD/MXN (FIX) de Banxico',
      );
    }

    await this.cache.set(cacheKey, rate, 60 * 10);
    return rate;
  }

  /**
   * Retorna USD/MXN del FIX para una fecha (YYYY-MM-DD).
   * Si no hay dato exactamente en esa fecha, recorre hacia atrás hasta 7 días.
   */
  async getUsdMxnAt(dateISO: string): Promise<number> {
    const cacheKey = `fx:usdmxn:fix:${dateISO}`;
    const cached = await this.cache.get<number>(cacheKey);
    if (cached && cached > 0) return cached;

    // Intento exacto: /datos/{fecha}/{fecha}
    const exact = await this.fetchFixRange(dateISO, dateISO).catch(() => null);
    if (exact && exact > 0) {
      await this.cache.set(cacheKey, exact, 60 * 60);
      return exact;
    }

    // Fallback hacia atrás 7 días
    const start = this.shiftDays(dateISO, 7);
    const fallback = await this.fetchFixRange(start, dateISO).catch(() => null);
    if (!fallback || fallback <= 0) {
      throw new Error(`No hay FIX disponible alrededor de ${dateISO}`);
    }
    await this.cache.set(cacheKey, fallback, 60 * 60);
    return fallback;
  }

  // ----------- Helpers privados -----------

  /** Llama /series/SF43718/datos/oportuno y parsea el último dato */
  private async fetchLatestFix(): Promise<number | null> {
    const { data } = await firstValueFrom(
      this.http.get(`/series/${this.SERIES_FIX}/datos/oportuno`),
    );
    // Estructura: { bmx: { series: [ { idSerie, titulo, datos: [ { fecha: 'YYYY-MM-DD', dato: '18.1234' } ] } ] } }
    const str = data?.bmx?.series?.[0]?.datos?.[0]?.dato;
    const v = Number((str ?? '').replace(',', ''));
    return Number.isFinite(v) && v > 0 ? v : null;
  }

  /** Llama /series/SF43718/datos/{start}/{end} y retorna el último dato disponible del rango */
  private async fetchFixRange(
    startISO: string,
    endISO: string,
  ): Promise<number | null> {
    const { data } = await firstValueFrom(
      this.http.get(`/series/${this.SERIES_FIX}/datos/${startISO}/${endISO}`),
    );
    const rows: Array<{ fecha: string; dato: string }> =
      data?.bmx?.series?.[0]?.datos ?? [];
    for (let i = rows.length - 1; i >= 0; i--) {
      const v = Number((rows[i]?.dato ?? '').replace(',', ''));
      if (Number.isFinite(v) && v > 0) return v;
    }
    return null;
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private shiftBusinessDays(daysBack: number): string {
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    return this.formatDate(d);
  }

  private shiftDays(dateISO: string, daysBack: number): string {
    const d = new Date(dateISO + 'T00:00:00');
    d.setDate(d.getDate() - daysBack);
    return this.formatDate(d);
  }
}
