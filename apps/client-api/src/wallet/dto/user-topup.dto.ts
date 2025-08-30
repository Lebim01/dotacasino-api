import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UserTopupDto {
  @ApiProperty({
    example: 100,
    description: 'Amount to top up',
    required: true,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(10000)
  amount!: number; // USD

  @ApiProperty({ example: 'USD', description: 'Currency code', required: true })
  @IsString()
  currency!: string;

  @ApiProperty({ example: 'Recarga', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string; // opcional del cliente; si no, generamos uno
}
