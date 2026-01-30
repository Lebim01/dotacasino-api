import { Body, Controller, Get, Ip, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@security/jwt.guard';
import { CurrentUser } from '@security/current-user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SoftGamingService } from './soft-gaming.service';

@ApiTags('SoftGaming')
@Controller('soft-gaming')
export class SoftGamingController {
  constructor(private readonly softGamingService: SoftGamingService) { }

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

  @Get('sync-merchants')
  syncMerchants() {
    return this.softGamingService.syncMerchants();
  }

  @Get('sync-games')
  syncGames() {
    return this.softGamingService.syncGames();
  }

  @Post('open-game')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  openGame(
    @Body('gameId') gameId: string,
    @CurrentUser() user: { userId: string },
    @Ip() ip: string,
  ) {
    return this.softGamingService.getAuthorizationUser(user.userId, gameId, ip, '123987xd');
  }

  @Post('add-user')
  addUser(
    @CurrentUser() user: { userId: string },
    @Ip() ip: string,
  ) {
    return this.softGamingService.addUser(user.userId, ip, 'MX', '123987xd');
  }
}
