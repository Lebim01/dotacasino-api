import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class TopupDto {
  @IsNumber()
  @Min(0.01)
  amount!: number; // USD

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string; // si no se envía, se genera
}
