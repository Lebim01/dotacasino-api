import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class SubmitKycDto {
  @IsArray()
  @ArrayNotEmpty()
  documentIds!: string[]; // IDs de KycDocument que el usuario desea enviar
}
