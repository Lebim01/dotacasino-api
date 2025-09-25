import { Controller, Get, Query } from '@nestjs/common';
import { ApiExcludeController, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { BetService } from './bet.service';

@ApiExcludeController()
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

  @Get('balance')
  getbalance(){
    return this.betService.getBalance("1owWHC0jL7Jls4p8EAya");
  }

  @Get('hall')
  hall(){
    return this.betService.createHall("1owWHC0jL7Jls4p8EAya");
  }

  @Get('sessionlog')
  sessionlog(){
    return this.betService.sessionLogs("290664467");
  }
}
