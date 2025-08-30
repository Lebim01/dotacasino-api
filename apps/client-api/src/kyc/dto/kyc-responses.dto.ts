import { ApiProperty } from '@nestjs/swagger';

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
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'ID_FRONT' })
  type!: string;

  @ApiProperty({ example: 'passport-front.jpg' })
  filename!: string;

  @ApiProperty({ example: '2023-01-01T00:00:00Z' })
  uploadedAt!: Date;
}
