import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly report: ReportsService) {}

  @Post('new')
  @ApiOkResponse({
    description: 'New report',
  })
  async newreport(@Body() body) {
    return this.report.newreport(body.text, body.url);
  }
}
