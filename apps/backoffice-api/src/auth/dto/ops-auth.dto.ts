import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class OpsAuthDTO {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
