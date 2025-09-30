import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Memberships } from 'apps/backoffice-api/src/types';

export enum Networks {
  BSC = 'BSC',
  TRX = 'TRX',
  ETH = 'ETH',
  POLYGON = 'POLYGON',
}

export class RegisterAuthDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 25 })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(25)
  password!: string;

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
  sponsor_id!: string;

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

export class CreateQRDto {
  @ApiProperty()
  @IsString()
  membership_type!: Memberships;

  @ApiProperty({
    enum: Networks,
  })
  @IsEnum(Networks)
  network!: Networks;
}
