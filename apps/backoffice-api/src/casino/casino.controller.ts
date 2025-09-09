import { Controller, Get, HttpException, Query } from '@nestjs/common';
import { CasinoService } from './casino.service';

@Controller('casino')
export class CasinoController {
  constructor(private readonly casinoService: CasinoService) {}

  @Get('valid')
  async validtoken(@Query('token') token: string) {
    const isvalid = await this.casinoService.isValid(token);

    if (isvalid) return 'OK';
    throw new HttpException('not valid', 403);
  }
}
