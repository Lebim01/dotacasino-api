import { Controller, Get } from '@nestjs/common';
import { SoftGamingService } from './soft-gaming.service';

@Controller('soft-gaming')
export class SoftGamingController {
  constructor(private readonly softGamingService: SoftGamingService) {}

  @Get('game-list')
  gamelist() {
    return this.softGamingService.getGameList();
  }

  @Get('category-list')
  categorylist() {
    return this.softGamingService.getCategoryList();
  }

  @Get('sync-categories')
  syncCategories() {
    return this.softGamingService.syncCategories();
  }
}
