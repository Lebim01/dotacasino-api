import { Controller, Get, Query } from '@nestjs/common';
import { GamesService } from './games.service';
import { ListGamesDto } from './dto/list-games.dto';

@Controller('games')
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get()
  async list(@Query() q: ListGamesDto) {
    return this.games.list(q);
  }
}
