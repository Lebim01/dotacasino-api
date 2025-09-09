import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { OpsAuthDTO } from './ops-auth.dto';

export class LoginAuthDto extends OpsAuthDTO {
  @ApiProperty({ minLength: 8, maxLength: 25 })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(25)
  password!: string;
}
