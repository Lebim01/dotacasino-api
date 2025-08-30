import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsDateString,
} from 'class-validator';
import { $Enums } from '@prisma/client';

export class CreateKycDocumentDto {
  @IsEnum($Enums.KycDocType) type!: $Enums.KycDocType;
  @IsString() storageKey!: string; // ej: "kyc/<userId>/passport.jpg"
  @IsString() mimeType!: string; // "image/jpeg", "application/pdf"
  @IsOptional() @IsString() country?: string; // "MX", "US", etc.
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsString() checksum?: string; // sha256 opcional
}
