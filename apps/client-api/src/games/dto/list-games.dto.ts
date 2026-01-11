import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ListGamesDto {
  @ApiProperty({
    description: 'Search term for filtering games',
    required: false,
    example: 'poker',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Game category ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Game category name (case insensitive)',
    required: false,
  })
  @IsOptional()
  @IsString()
  categoryName?: string;

  @ApiProperty({
    description: 'Provider',
    required: false,
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({
    description: 'Device type',
    required: false,
    enum: ['DESKTOP', 'MOBILE'],
  })
  @IsOptional()
  @IsString()
  device?: 'DESKTOP' | 'MOBILE';

  @ApiProperty({
    description: 'Sort order',
    required: false,
    enum: ['order', 'alpha', 'recent'],
    default: 'order',
  })
  @IsOptional()
  @IsIn(['order', 'alpha', 'recent'])
  sort?: 'order' | 'alpha' | 'recent' = 'order';

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    minimum: 1,
    maximum: 200,
    default: 24,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize: number = 24;

  @ApiProperty({
    description: 'Page number',
    required: false,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiProperty({
    description: 'Domain',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  domain: string = '';
}
