import { Controller, Get } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';

@Controller('countries')
export class CountriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('')
  async getchart() {
    const report = await this.prisma.systemReport.findUnique({
      where: { id: 'countries' }
    });
    return report?.data || {};
  }
}
