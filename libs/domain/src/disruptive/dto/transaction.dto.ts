import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateDepositDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  amount!: number;
}

export class CreateTransactionDisruptiveCasinoDto {
  @IsNotEmpty()
  @IsString()
  network!: 'BSC' | 'TRX' | 'ETH' | 'POLYGON';

  @IsNotEmpty()
  @IsNumber()
  amount!: number;

  @IsNotEmpty()
  @IsString()
  usertoken!: string;
}

export class CompleteTransactionDisruptiveCasinoDto {
  @IsNotEmpty()
  @IsString()
  address!: string;
}

export class CreateWithdrawCasino {
  @IsNotEmpty()
  @IsString()
  address!: string;

  @IsNotEmpty()
  @IsNumber()
  amount!: number;
}

export class UserTokenDTO {
  @IsNotEmpty()
  @IsString()
  usertoken!: string;
}

export class ApproveWithdraw {
  @IsArray()
  ids!: string[];
}
