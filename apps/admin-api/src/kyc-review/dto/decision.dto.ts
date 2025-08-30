import { IsString, IsOptional } from 'class-validator';
export class DecisionDto {
  @IsOptional()
  @IsString()
  note?: string;
}
