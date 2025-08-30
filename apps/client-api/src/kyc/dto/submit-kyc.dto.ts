import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class SubmitKycDto {
  @ApiProperty({
    description: 'Array of document IDs to submit for verification',
    example: ['123e4567-e89b-12d3-a456-426614174000']
  })
  @IsArray()
  @IsString({ each: true })
  documentIds!: string[]; // IDs de KycDocument que el usuario desea enviar
}
