import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John'
  })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe'
  })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Gamer Name',
    example: 'OrangePlus33'
  })
  @IsOptional()
  @IsString()
  @Length(2, 60)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Phone',
    example: '+52__________'
  })
  @IsOptional()
  @IsString()
  // E.164 simple: + dígitos, o deja tu regex preferida
  @Matches(/^\+?[1-9]\d{6,14}$/)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Lang',
    example: 'es'
  })
  @IsOptional()
  @IsString()
  @Length(2, 5)
  language?: string; // 'es', 'en', 'pt', etc.

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;
}
