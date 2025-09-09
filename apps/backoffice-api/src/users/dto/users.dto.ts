import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { USER_ROLES } from '../../auth/auth.constants';

const USER_ROLES_ARRAY = Object.values(USER_ROLES);

export enum Concept {
  DIRECT = 'direct',
  BINARY = 'binary',
  RANK = 'rank',
  DEPOSIT = 'deposit',
}

export class UserDTO {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastname?: string;

  @ApiProperty({ type: 'string', format: 'email' })
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 4, maxLength: 25 })
  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  @MaxLength(25)
  password!: string;

  @ApiProperty({
    isArray: true,
    type: 'string',
    enum: USER_ROLES_ARRAY,
    example: USER_ROLES_ARRAY,
    minLength: 1,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsNotEmpty({ each: true })
  @IsIn(USER_ROLES_ARRAY, { each: true, message: 'INVALID_ROLES' })
  roles!: string[];
}

export class UpdateUserIMGDTO {
  @ApiProperty({ type: 'string', format: 'url' })
  @IsNotEmpty()
  @IsUrl()
  imgURL!: string;
}

export class CreateWithdrawDTO {
  @ApiProperty({ type: 'number' })
  @IsNotEmpty()
  @IsNumber()
  amount!: number;

  @ApiProperty({ type: 'string' })
  @IsNotEmpty()
  @IsString()
  otp!: string;

  @ApiProperty({
    type: 'string',
    enum: ['direct', 'binary', 'rank', 'deposit'],
  })
  @IsNotEmpty()
  @IsString()
  @IsEnum(Concept)
  type!: Concept;

  @ApiProperty({ type: 'string' })
  @IsNotEmpty()
  @IsString()
  @IsOptional()
  deposit_id?: string;
}

export class ChangePasswordDTO {
  @ApiProperty({ type: 'string' })
  @IsString()
  @IsNotEmpty()
  previous_password!: string;

  @ApiProperty({ type: 'string' })
  @IsString()
  @IsNotEmpty()
  new_password!: string;
}
