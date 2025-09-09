import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class RankReportDTO {
  @ApiProperty()
  @IsNumber()
  year!: number;

  @ApiProperty()
  @IsNumber()
  month!: number;
}
