import { Controller, Param, Post, Get, Query, Body } from '@nestjs/common';
import { RanksService } from './ranks.service';
import { ApiExcludeEndpoint, ApiOperation } from '@nestjs/swagger';
import { Ranks, ranks_object } from './ranks_object';
import { GetUserRankDTO } from './dto/payload';

@Controller('ranks')
export class RanksController {
  constructor(private ranksService: RanksService) {}

  @ApiExcludeEndpoint()
  @Post('cutRanks')
  upateRanks() {
    return this.ranksService.cutRanks();
  }

  @ApiExcludeEndpoint()
  @Post('updateUserQueue/:id')
  updateUserQueue(@Param('id') id_user: string) {
    return this.ranksService.updateRankQueue(id_user);
  }

  @ApiExcludeEndpoint()
  @Post('cutUserQueue/:id')
  upateRanksQueue(@Param('id') id_user: string) {
    return this.ranksService.updateRankQueue(id_user);
  }

  @ApiExcludeEndpoint()
  @Post('updateUserRank/:id')
  updateUserRank(
    @Param('id') id_user: string,
    @Query('corte') is_corte: string,
  ) {
    return this.ranksService.updateUserRank(id_user, Boolean(is_corte));
  }

  @Get('list')
  getlistranks() {
    return ranks_object;
  }

  @Post('getUserRank')
  @ApiOperation({ summary: 'Get current deposits value' })
  async getRank(@Body() body: GetUserRankDTO) {
    return this.ranksService.getRankUser(body.id_user);
  }

  @ApiExcludeEndpoint()
  @Post('getRankKey/:key')
  async getRankKey(@Body() body: any, @Param('key') key: Ranks) {
    if (!body.id_user) throw new Error('id_user is required');
    return await this.ranksService.getRankKey(body.id_user, key);
  }
}
