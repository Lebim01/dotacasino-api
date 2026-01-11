import { Module } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import { SoftGamingController } from './soft-gaming.controller';
import { SoftGamingService } from './soft-gaming.service';

@Module({
  providers: [PrismaService, SoftGamingService],
  controllers: [SoftGamingController],
  imports: [],
  exports: [SoftGamingService],
})
export class SoftGamingModule {}
