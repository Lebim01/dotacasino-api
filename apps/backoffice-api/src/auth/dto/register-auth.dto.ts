import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LoginAuthDto } from './login-auth.dto';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterAuthDto extends LoginAuthDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  side!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sponsor_id!: string | null;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  country!: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refCodeL!: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refCodeR!: string;
}
