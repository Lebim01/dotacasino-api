import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UserTopupDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(10000)
  amount!: number; // USD

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string; // opcional del cliente; si no, generamos uno
}
