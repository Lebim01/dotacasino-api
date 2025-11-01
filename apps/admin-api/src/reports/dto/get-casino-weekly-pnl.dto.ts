import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class GetCasinoWeeklyPnlDto {
  /**
   * Rango opcional (inclusive) en formato YYYY-MM-DD (en TZ America/Mexico_City).
   * Si no se envía, toma la semana COMPLETA anterior (lunes a domingo) en CDMX.
   */
  @IsOptional() @IsString() from?: string; // ej. "2025-10-27"
  @IsOptional() @IsString() to?: string; // ej. "2025-11-02"

  /**
   * TZ IANA (por defecto America/Mexico_City)
   */
  @IsOptional() @IsString() timezone?: string;

  /**
   * Incluir también la semana en curso (por defecto false).
   * Útil si quieres ver cortes parciales.
   */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeCurrentWeek?: boolean = false;
}
