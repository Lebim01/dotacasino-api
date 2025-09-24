import {
  Controller,
  Get,
  HttpException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { SignalsService } from './signals.service';
import { validatePageAndLimit } from '../utils/pagination';
import { JwtAuthGuard } from '@security/jwt.guard';

@Controller('signals')
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  @Get('')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  getall(@Query('page') page = '1', @Query('limit') limit = '10') {
    const _page = parseInt(page);
    const _limit = parseInt(limit);

    const hasError = validatePageAndLimit(_page, _limit);
    if (hasError) throw new HttpException(hasError.message, 400);
    return this.signalsService.getAll(_page, _limit);
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  getone(@Param('id') id: string) {
    return this.signalsService.getOne(id);
  }
}
