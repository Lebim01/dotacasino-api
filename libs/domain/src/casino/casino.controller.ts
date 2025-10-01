import { Controller, Get, HttpException, Query } from '@nestjs/common';
import { CasinoService } from './casino.service';

@Controller('casino')
export class CasinoController {
  constructor(private readonly casinoService: CasinoService) {}

}
