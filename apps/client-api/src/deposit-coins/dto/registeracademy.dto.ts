import { IsEnum, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Networks } from '../../users/dto/registeracademy.dto';

export class CreateQRDto {
  @ApiProperty()
  @IsNumber()
  amount!: number;

  @ApiProperty({
    enum: Networks,
  })
  @IsEnum(Networks)
  network!: Networks;
}
