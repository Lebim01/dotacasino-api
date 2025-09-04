import { IsString, Length } from 'class-validator';

export class AttachReferralDto {
  @IsString()
  @Length(4, 32) // ajusta según longitud de tu refCode
  refCode!: string;
}
