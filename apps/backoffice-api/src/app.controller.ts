import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from 'libs/db/src/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('')
  async remove() {
    await this.prisma.ipnLog.deleteMany({});
  }
}
