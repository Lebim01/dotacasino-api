import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { KycDocType } from '@prisma/client';

export class CreateKycDocumentDto {
  @ApiProperty({
    description: 'Type of document',
    enum: KycDocType,
    example: KycDocType.ID_CARD,
    required: true,
  })
  @IsEnum(KycDocType)
  type!: KycDocType;

  @ApiProperty({
    description: 'Base64 encoded image',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    required: true,
  })
  @IsString()
  file!: string;

  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsString() checksum?: string;
}
