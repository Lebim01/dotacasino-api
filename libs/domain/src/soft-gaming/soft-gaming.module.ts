import { Module } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import { SoftGamingController } from './soft-gaming.controller';
import { SoftGamingService } from './soft-gaming.service';
import { HttpService } from '@nestjs/axios';

@Module({
  providers: [PrismaService, SoftGamingService],
  controllers: [SoftGamingController],
  imports: [],
})
export class SoftGamingModule {}
