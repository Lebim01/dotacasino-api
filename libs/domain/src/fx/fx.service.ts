import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import axios, { AxiosInstance } from 'axios';
import { Currency } from '@prisma/client';
import {
  convertCurrency,
  convertLocalToUsdAndCurrency,
  type FxUsdRates,
} from 'libs/shared/src/currency';

/**
 * FxService
 * - Banxico FIX for USD/MXN
 * - Live USD base rates for MXN/COP/ARS (daily cached)
 */
@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name);
  private readonly SERIES_FIX = 'SF43718';
  private readonly DAILY_TTL_SECONDS = 60 * 60 * 24;
  private readonly SUPPORTED_CURRENCIES: Currency[] = [
    Currency.USD,
    Currency.MXN,
    Currency.COP,
    Currency.ARS,
  ];

  private readonly banxicoHttp: AxiosInstance;
  private readonly liveRatesHttp: AxiosInstance;

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {
    this.banxicoHttp = axios.create({
      baseURL: 'https://www.banxico.org.mx/SieAPIRest/service/v1',
      timeout: 8000,
      headers: {
        'Bmx-Token': process.env.BANXICO_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    this.liveRatesHttp = axios.create({
      baseURL: 'https://open.er-api.com/v6/266c73cfb2c48ccd4920ed6d',
      timeout: 8000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Current USD/MXN. Tries Banxico first, falls back to daily live rates.
   */
  async getUsdMxn(): Promise<number> {
    const cacheKey = 'fx:usdmxn:fix';
    const cached = await this.cache.get<number>(cacheKey);
    if (cached && cached > 0) return cached;

    const latest = await this.fetchLatestFix().catch((e) => {
      this.logger.warn(`Banxico current not available: ${e?.message ?? e}`);
      return null;
    });

    let rate = latest;

    if (!rate) {
      const from = this.shiftBusinessDays(7);
      const to = this.formatDate(new Date());
      rate = await this.fetchFixRange(from, to).catch((e) => {
        this.logger.error(`Banxico range failed: ${e?.message ?? e}`);
        return null;
      });
    }

    if (!rate || !Number.isFinite(rate) || rate <= 0) {
      const rates = await this.getUsdRates().catch(() => null);
      rate = rates?.[Currency.MXN] ?? null;
    }

    if (!rate || !Number.isFinite(rate) || rate <= 0) {
      throw new Error('Could not obtain USD/MXN exchange rate');
    }

    await this.cache.set(cacheKey, rate, 60 * 10);
    return rate;
  }

  /**
   * USD/MXN FIX for a date (YYYY-MM-DD). If exact date not found,
   * searches back up to 7 days.
   */
  async getUsdMxnAt(dateISO: string): Promise<number> {
    const cacheKey = `fx:usdmxn:fix:${dateISO}`;
    const cached = await this.cache.get<number>(cacheKey);
    if (cached && cached > 0) return cached;

    const exact = await this.fetchFixRange(dateISO, dateISO).catch(() => null);
    if (exact && exact > 0) {
      await this.cache.set(cacheKey, exact, 60 * 60);
      return exact;
    }

    const start = this.shiftDays(dateISO, 7);
    const fallback = await this.fetchFixRange(start, dateISO).catch(() => null);
    if (!fallback || fallback <= 0) {
      throw new Error(`No FIX available around ${dateISO}`);
    }

    await this.cache.set(cacheKey, fallback, 60 * 60);
    return fallback;
  }

  /**
   * Live USD base rates, cached once per day.
   */
  async getUsdRates(forceRefresh = false): Promise<Record<Currency, number>> {
    const today = this.formatDate(new Date());
    const cacheKey = `fx:usd:rates:${today}`;

    if (!forceRefresh) {
      const cached = await this.cache.get<Record<Currency, number>>(cacheKey);
      if (cached && this.hasAllSupportedRates(cached)) return cached;
    }

    const liveRates = await this.fetchLiveUsdRates();
    await this.cache.set(cacheKey, liveRates, this.DAILY_TTL_SECONDS);
    await this.cache.set('fx:usd:rates:latest', liveRates, this.DAILY_TTL_SECONDS);
    return liveRates;
  }

  /**
   * Intended to be called by a daily cron.
   */
  async refreshUsdRatesDaily(): Promise<Record<Currency, number>> {
    return this.getUsdRates(true);
  }

  async convert(
    amount: number,
    from: Currency,
    to: Currency,
    decimals = 2,
  ): Promise<number> {
    const rates = await this.getUsdRates();
    return convertCurrency(amount, from, to, rates, decimals);
  }

  async convertViaUsd(
    amount: number,
    from: Currency,
    to: Currency,
    decimals = 2,
  ): Promise<{ usd: number; target: number }> {
    const rates = await this.getUsdRates();
    return convertLocalToUsdAndCurrency(amount, from, to, rates, decimals);
  }

  private async fetchLatestFix(): Promise<number | null> {
    const { data } = await this.banxicoHttp.get(
      `/series/${this.SERIES_FIX}/datos/oportuno`,
    );

    const str = data?.bmx?.series?.[0]?.datos?.[0]?.dato;
    const value = Number((str ?? '').replace(',', ''));
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  private async fetchFixRange(
    startISO: string,
    endISO: string,
  ): Promise<number | null> {
    const { data } = await this.banxicoHttp.get(
      `/series/${this.SERIES_FIX}/datos/${startISO}/${endISO}`,
    );

    const rows: Array<{ fecha: string; dato: string }> =
      data?.bmx?.series?.[0]?.datos ?? [];

    for (let i = rows.length - 1; i >= 0; i--) {
      const value = Number((rows[i]?.dato ?? '').replace(',', ''));
      if (Number.isFinite(value) && value > 0) return value;
    }

    return null;
  }

  private async fetchLiveUsdRates(): Promise<Record<Currency, number>> {
    const { data } = await this.liveRatesHttp.get('/latest/USD');
    const rates = data?.rates as Record<string, number> | undefined;

    const result: FxUsdRates = {
      [Currency.USD]: 1,
      [Currency.MXN]: rates?.MXN,
      [Currency.COP]: rates?.COP,
      [Currency.ARS]: rates?.ARS,
    };

    if (!this.hasAllSupportedRates(result)) {
      throw new Error('FX provider did not return required rates');
    }

    return result as Record<Currency, number>;
  }

  private hasAllSupportedRates(rates: FxUsdRates): boolean {
    return this.SUPPORTED_CURRENCIES.every((currency) => {
      const value = rates[currency];
      return typeof value === 'number' && Number.isFinite(value) && value > 0;
    });
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
