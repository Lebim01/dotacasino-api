import { Currency } from '@prisma/client';

export const DEFAULT_CURRENCY = Currency.USD;
export const CURRENCY = DEFAULT_CURRENCY; // compat
export type CurrencyCode = Currency;

const COUNTRY_TO_CURRENCY: Record<string, Currency> = {
  MX: Currency.MXN,
  MEX: Currency.MXN,
  MEXICO: Currency.MXN,
  AR: Currency.ARS,
  ARG: Currency.ARS,
  ARGENTINA: Currency.ARS,
  CO: Currency.COP,
  COL: Currency.COP,
  COLOMBIA: Currency.COP,
};

export function resolveCurrencyByCountry(country?: string | null): Currency {
  if (!country) return DEFAULT_CURRENCY;

  const normalized = country
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

  return COUNTRY_TO_CURRENCY[normalized] ?? DEFAULT_CURRENCY;
}

export type FxUsdRates = Partial<Record<Currency, number>>;

function roundTo(value: number, decimals?: number): number {
  if (decimals === undefined) return value;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function getUsdRate(currency: Currency, usdRates: FxUsdRates): number {
  if (currency === Currency.USD) return 1;

  const rate = usdRates[currency];
  if (!rate || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(`FX rate missing or invalid for ${currency}`);
  }
  return rate;
}

/**
 * Convierte entre dos monedas usando USD como puente:
 * - USD -> LOCAL
 * - LOCAL -> USD
 * - LOCAL -> USD -> OTRA_LOCAL
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  usdRates: FxUsdRates,
  decimals?: number,
): number {
  if (!Number.isFinite(amount)) {
    throw new Error('Amount must be a finite number');
  }
  if (from === to) return roundTo(amount, decimals);

  const fromUsdRate = getUsdRate(from, usdRates);
  const toUsdRate = getUsdRate(to, usdRates);

  const usdAmount = amount / fromUsdRate;
  const converted = usdAmount * toUsdRate;
  return roundTo(converted, decimals);
}

export function convertUsdToLocal(
  amountUsd: number,
  to: Currency,
  usdRates: FxUsdRates,
  decimals?: number,
): number {
  return convertCurrency(amountUsd, Currency.USD, to, usdRates, decimals);
}

export function convertLocalToUsdAndCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  usdRates: FxUsdRates,
  decimals?: number,
): { usd: number; target: number } {
  const usd = convertCurrency(amount, from, Currency.USD, usdRates, decimals);
  const target = convertCurrency(usd, Currency.USD, to, usdRates, decimals);
  return { usd, target };
}
