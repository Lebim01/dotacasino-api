import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
  Ip,
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
import { DOMAINS, DOMAINS_BY_COUNTRY } from 'libs/shared/src/domains';

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
    @Body() body: any,
    @Param('gameSlug') gameSlug: string,
    @CurrentUser() u: { userId: string },
  ) {
    return this.games.openGame(
      gameSlug,
      body.domain || 'https://dotacasino-front.vercel.app',
      u?.userId,
      body.ip
    );
  }

  @Post('refresh/:sessionId')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async refreshdb(@Param('sessionId') sessionId: string) {
    return this.bet.getHistoryGames(sessionId);
  }

  @Get('categories')
  async categories(@Query('pageSize') pageSize: number) {
    return this.games.categories(pageSize);
  }

  @Post('providers')
  async providers(@Body() body: { domain: string; country?: string }) {
    const country = DOMAINS_BY_COUNTRY[body.domain];
    return this.games.providers(body.domain, country);
  }
}
