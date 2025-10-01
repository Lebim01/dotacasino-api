import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Networks } from '../../users/dto/registeracademy.dto';

export class CreateDepositQRDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  amount!: number;

  @ApiProperty({
    enum: Networks,
  })
  @IsEnum(Networks)
  @IsNotEmpty()
  network!: Networks;
}

export class CompleteTransactionDisruptiveCasinoDto {
  @IsNotEmpty()
  @IsString()
  address!: string;
}