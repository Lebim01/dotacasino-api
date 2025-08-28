import { Controller, Get, Query } from '@nestjs/common';
import { GamesService } from './games.service';
import { ListGamesDto } from './dto/list-games.dto';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ListGamesResponseDto } from './dto/list-games-response.dto';

@ApiTags('Games')
@Controller('games')
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get()
  @ApiOkResponse({
    description: 'List of games',
    type: ListGamesResponseDto
  })
  async list(@Query() q: ListGamesDto) {
    return this.games.list(q);
  }
}
