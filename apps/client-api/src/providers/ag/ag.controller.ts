import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';
import { AgService } from './ag.service';

class CheckCreateBody {
  @IsString()
  @Length(1, 20)
  @Matches(/^[A-Za-z0-9_]+$/)
  loginname!: string;

  @IsString()
  @MinLength(6)
  @Length(1, 20)
  // Evitar chars prohibidos según doc
  @Matches(/^[^'",\\\/><&#%?\s]+$/)
  password!: string;

  @IsOptional()
  @IsIn(['0', '1'])
  actype?: '0' | '1';

  @IsOptional()
  @IsIn(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'])
  oddtype?: any;

  @IsOptional()
  @IsIn(['CNY', 'USD', 'EUR'])
  cur?: any;
}

@Controller('providers/ag')
export class AgController {
  constructor(private readonly ag: AgService) {}

  @Post('account')
  @HttpCode(HttpStatus.OK)
  async checkOrCreate(@Body() body: CheckCreateBody) {
    return this.ag.checkOrCreateAccount(body);
  }
}
