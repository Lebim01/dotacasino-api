import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'oldPassword123'
  })
  @IsString()
  currentPassword!: string;

  @ApiProperty({
    description: 'New password',
    example: 'newPassword123'
  })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
