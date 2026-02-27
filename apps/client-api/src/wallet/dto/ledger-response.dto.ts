import { ApiProperty } from '@nestjs/swagger';

export class LedgerEntryDto {
  @ApiProperty({ example: 'MXN' })
  currency!: string;

  @ApiProperty({ example: 'BET_WIN' })
  kind!: string;

  @ApiProperty({ example: 100.50 })
  amount!: number;

  @ApiProperty({ example: 1000.50 })
  balance!: number;

  @ApiProperty({ example: '2023-01-01T00:00:00Z' })
  createdAt!: Date;
}

export class LedgerResponseDto {
  @ApiProperty({ type: [LedgerEntryDto] })
  items!: LedgerEntryDto[];

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 25 })
  pageSize!: number;
}
