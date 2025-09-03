import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { BetService } from './bet.service';

@ApiTags('Casino')
@Controller('bet')
export class BetController {
  constructor(private readonly betService: BetService) {}

  @Get('gameList')
  @ApiOkResponse({
    description: 'List of games',
  })
  async gameList() {
    return this.betService.gameList({});
  }
}
