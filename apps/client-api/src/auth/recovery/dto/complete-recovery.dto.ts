import { IsString, MinLength, IsUUID, Length } from 'class-validator';
export class CompleteRecoveryDto {
  @IsUUID() rid!: string;
  @IsString() @Length(24, 256) rt!: string;
  @IsString() @MinLength(8) newPassword!: string; // agrega reglas extra si quieres
}
