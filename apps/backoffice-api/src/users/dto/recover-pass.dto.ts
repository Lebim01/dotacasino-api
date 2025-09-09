import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { LoginAuthDto } from '../../auth/dto/login-auth.dto';

export class RecoverOTPDTO {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class RecoverPassDTO extends LoginAuthDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(4, 4, { message: 'OTP must be 4 characters long' })
  otp?: string;
}

export class ChangePassDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be 8 characters long' })
  password?: string;
}

export class ChangeProfileDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  whatsapp?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  country?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  state?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  city?: string;
}
