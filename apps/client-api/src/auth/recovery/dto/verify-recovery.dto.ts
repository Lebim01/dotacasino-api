import { IsString, IsUUID, Length } from 'class-validator';
export class VerifyRecoveryDto {
  @IsUUID() rid!: string; // id del registro (uuid)
  @IsString() @Length(24, 256) rt!: string; // token plano
}
