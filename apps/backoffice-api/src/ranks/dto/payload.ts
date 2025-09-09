import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GetUserRankDTO {
  @ApiProperty()
  @IsString()
  id_user!: string;
}
