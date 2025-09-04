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
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
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

  @Post('openGame/:gameId')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async openGame(
    @Headers() headers: any,
    @Param('gameId') gameId: string,
    @CurrentUser() u: { userId: string },
  ) {
    return this.bet.openGame(
      headers.origin || 'https://dota.click',
      gameId,
      u.userId,
    );
  }
}
