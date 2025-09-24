import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, Length } from 'class-validator';
export class VerifyRecoveryDto {
  @ApiProperty()
  @IsUUID()
  rid!: string; // id del registro (uuid)

  @ApiProperty()
  @IsString()
  @Length(24, 256)
  rt!: string; // token plano
}
