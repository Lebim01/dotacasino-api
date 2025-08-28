import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListGamesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  provider?: string; // ej. "AG"

  @IsOptional()
  @IsString()
  platformType?: string; // ej. "AGIN","AGQ","SLOT"

  @IsOptional()
  @IsString()
  category?: 'LIVE' | 'EGAME' | 'TABLE' | 'OTHER';

  @IsOptional()
  @IsString()
  device?: 'DESKTOP' | 'MOBILE';

  @IsOptional()
  @IsIn(['order', 'alpha', 'recent'])
  sort?: 'order' | 'alpha' | 'recent' = 'order';

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize: number = 24;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page: number = 1;
}
