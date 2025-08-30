import { ApiProperty } from '@nestjs/swagger';
import { KycDocStatus, KycDocType } from '@prisma/client';

export class KycStatusResponseDto {
  @ApiProperty({ example: 'PENDING' })
  status!: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

  @ApiProperty({ example: '2023-01-01T00:00:00Z', nullable: true })
  submittedAt?: Date;

  @ApiProperty({ example: '2023-01-02T00:00:00Z', nullable: true })
  reviewedAt?: Date;

  @ApiProperty({ example: 'Missing document', nullable: true })
  rejectionReason?: string;
}

export class KycRequirementDto {
  @ApiProperty({ example: 'ID_FRONT' })
  type!: string;

  @ApiProperty({ example: 'Front of ID Card' })
  name!: string;

  @ApiProperty({ example: true })
  required!: boolean;
}

export class KycDocumentDto {
  @ApiProperty({ example: '6054ea23-2e15-4c56-95e7-57ea1ca3c033' })
  id!: string;

  @ApiProperty({ example: 'c2435dd6-a349-459c-9641-0a5e12c13cf6' })
  userId!: string;

  @ApiProperty({ enum: KycDocType, example: 'ID_CARD' })
  type!: KycDocType;

  @ApiProperty({ enum: KycDocStatus, example: 'UPLOADED' })
  status!: KycDocStatus;

  @ApiProperty({ example: 'casino/kyc-documents/1756584496052-f7a842af6a463643.png' })
  storageKey!: string;

  @ApiProperty({ example: 'image/png' })
  mimeType!: string;

  @ApiProperty({ example: null, nullable: true })
  country?: string | null;

  @ApiProperty({ example: null, nullable: true })
  expiresAt?: Date | null;

  @ApiProperty({ example: '56e208af98da2d8ddedaeacfcea8ef28' })
  checksum!: string;

  @ApiProperty({ example: null, nullable: true })
  reviewerId?: string | null;

  @ApiProperty({ example: null, nullable: true })
  reviewNotes?: string | null;

  @ApiProperty({ example: '2025-08-30T20:08:16.956Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-08-30T20:08:16.956Z' })
  updatedAt!: Date;
}
