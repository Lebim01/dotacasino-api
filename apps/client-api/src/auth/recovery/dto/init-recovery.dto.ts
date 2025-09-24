import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail } from 'class-validator';
export class InitRecoveryDto {
  @ApiProperty()
  @IsEmail()
  email!: string;
}

export class ResponseOK {
  @ApiProperty()
  @IsBoolean()
  ok!: boolean;
}
