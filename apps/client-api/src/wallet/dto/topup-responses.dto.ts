import { ApiProperty } from '@nestjs/swagger';

export class TopupResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 100 })
  amount!: number;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({ example: 'PENDING' })
  status!: string;

  @ApiProperty({ example: '2023-01-01T00:00:00Z' })
  createdAt!: Date;
}

export class TopupHistoryResponseDto {
  @ApiProperty({ type: [TopupResponseDto] })
  items!: TopupResponseDto[];

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;
}
