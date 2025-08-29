import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { LedgerEntryKind } from './ledger-entry-kind.enum';

export class QueryLedgerDto {
  @ApiPropertyOptional({
    enum: LedgerEntryKind,
    description: 'Filter by transaction type'
  })
  @IsOptional()
  @IsEnum(LedgerEntryKind)
  kind?: LedgerEntryKind;

  @ApiPropertyOptional({
    minimum: 1,
    default: 1,
    description: 'Page number'
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    default: 25,
    description: 'Items per page'
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 25;
}
