import { Module } from '@nestjs/common';
import { ChipsController } from './chips.controller';
import { ChipsService } from './chips.service';
import { PrismaService } from 'libs/db/src/prisma.service';

@Module({
  controllers: [ChipsController],
  providers: [ChipsService, PrismaService],
})
export class ChipsModule {}
