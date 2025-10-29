import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsString } from 'class-validator';
export class InitRecoveryDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  host!: string;
}

export class ResponseOK {
  @ApiProperty()
  @IsBoolean()
  ok!: boolean;
}
