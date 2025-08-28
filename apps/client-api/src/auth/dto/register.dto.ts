import {
  IsEmail,
  IsString,
  MinLength,
  IsBoolean,
  IsOptional,
  Length,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;

  @IsString()
  @Length(2, 60)
  country!: string;

  @IsBoolean()
  acceptTerms!: boolean;

  // En el futuro puedes usarlo para referidos
  @IsOptional()
  @IsString()
  referralCode?: string;
}
