import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Max } from 'class-validator';

export class PayReward {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  @Max(2)
  percent!: number;
}

export class ProcessTransaction {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  txn_id!: string;
}

export class AddPointsDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    enum: ['right', 'left'],
  })
  @IsString()
  @IsNotEmpty()
  side!: 'left' | 'right';

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  points!: number;
}

export class EmailUserDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  email!: string;
}

export class ChangeEmailUserDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  old_email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  new_email!: string;
}

export class ChangePasswordUserDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password!: string;
}
