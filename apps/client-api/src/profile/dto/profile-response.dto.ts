import { ApiProperty } from '@nestjs/swagger';

export class ProfileResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'John' })
  firstName?: string;

  @ApiProperty({ example: 'Doe' })
  lastName?: string;

  @ApiProperty({ example: 'ES' })
  country!: string;

  @ApiProperty({ example: 'es' })
  language!: string;

  @ApiProperty({ example: "PENDING" })
  kycStatus!: boolean;

  @ApiProperty({ example: '2023-01-01T00:00:00Z' })
  createdAt!: Date;
}
