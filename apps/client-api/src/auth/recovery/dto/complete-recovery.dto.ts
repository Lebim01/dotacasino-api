import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsUUID, Length } from 'class-validator';
export class CompleteRecoveryDto {
  @ApiProperty()
  @IsUUID()
  rid!: string;

  @ApiProperty()
  @IsString()
  @Length(24, 256)
  rt!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
