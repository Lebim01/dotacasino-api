import { ApiProperty } from '@nestjs/swagger';

export class BalanceResponseDto {
  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({ example: 1000.50 })
  balance!: number;
}
