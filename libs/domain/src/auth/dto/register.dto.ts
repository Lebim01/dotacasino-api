import {
  IsEmail,
  IsString,
  MinLength,
  IsBoolean,
  IsOptional,
  Length,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  ip!: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'User password',
    minimum: 8,
    example: 'password123',
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;

  @ApiProperty({
    description: 'User country',
    minLength: 2,
    maxLength: 60,
    example: 'ES',
  })
  @IsString()
  @Length(2, 60)
  country!: string;

  @ApiProperty({
    description: 'User acceptance of terms and conditions',
    example: true,
  })
  @IsBoolean()
  acceptTerms!: boolean;

  @ApiProperty({
    description: 'Referral code (optional)',
    required: false,
    example: 'REF123',
  })
  @IsString()
  @IsOptional()
  referralCode!: string;
}
