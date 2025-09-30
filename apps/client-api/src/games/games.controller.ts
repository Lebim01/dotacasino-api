import {
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GamesService } from './games.service';
import { ListGamesDto } from './dto/list-games.dto';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ListGamesResponseDto } from './dto/list-games-response.dto';
import { BetService } from '../bet/bet.service';
import { CurrentUser } from '@security/current-user.decorator';
import { JwtAuthGuard } from '@security/jwt.guard';

@ApiTags('Games')
@Controller('games')
export class GamesController {
  constructor(
    private readonly games: GamesService,
    private readonly bet: BetService,
  ) {}

  @Get()
  @ApiOkResponse({
    description: 'List of games',
    type: ListGamesResponseDto,
  })
  async list(@Query() q: ListGamesDto) {
    return this.games.list(q);
  }

  @Post('openGame/:gameSlug')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async openGame(
    @Headers() headers: any,
    @Param('gameSlug') gameSlug: string,
    @CurrentUser() u: { userId: string },
  ) {
    return this.games.openGame(
      gameSlug,
      headers.origin || 'https://dotacasino-front.vercel.app',
      u?.userId,
    );
  }

  @Post('refresh/:sessionId')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async refreshdb(@Param('sessionId') sessionId: string) {
    return this.bet.getHistoryGames(sessionId);
  }

  @Get('categories')
  async categories() {
    return this.games.categories();
  }
}
