import { Controller, Get } from '@nestjs/common';
import { SoftGamingService } from './soft-gaming.service';

@Controller('soft-gaming')
export class SoftGamingController {
  constructor(private readonly softGamingService: SoftGamingService) {}

  @Get('list')
  list() {
    return this.softGamingService.getGameList();
  }
}
