import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { GamesService } from './games.service';
import { ListGamesDto } from './dto/list-games.dto';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get('admin-list')
  async adminlist(@Query() q: ListGamesDto) {
    return this.gamesService.list(q);
  }

  @Post('change-show/:id')
  async changeshow(@Param('id') id: string, @Body() body) {
    return this.gamesService.changeshow(id, body.show);
  }
}
