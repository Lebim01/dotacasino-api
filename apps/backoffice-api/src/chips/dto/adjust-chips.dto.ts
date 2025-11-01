import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum AdjustDirection {
  CREDIT = 'CREDIT', // agrega fichas (incrementa balance)
  DEBIT = 'DEBIT', // resta fichas (decrementa balance)
}

export class AdjustChipsDto {
  /** Identificador de la wallet a ajustar (recomendado). */
  @IsString()
  @IsNotEmpty()
  walletId!: string;

  /** Monto POSITIVO en USD (u otra divisa de la wallet). */
  @IsNumber()
  @Min(0.00000001)
  amount!: number;

  /** Dirección del ajuste: CREDIT (suma) o DEBIT (resta). */
  @IsEnum(AdjustDirection)
  direction!: AdjustDirection;

  /** Motivo/razón visible en meta del ledger. */
  @IsString()
  @IsOptional()
  reason?: string;

  /** Clave de idempotencia para evitar dobles cargos. Recomendada. */
  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  /** Permitir saldo negativo (por defecto false). */
  @IsBoolean()
  @IsOptional()
  allowNegative?: boolean;
}
