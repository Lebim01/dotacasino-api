import { Module } from '@nestjs/common';
import { CasinoService } from './casino.service';
import { CasinoController } from './casino.controller';
import { PrismaService } from 'libs/db/src/prisma.service';

@Module({
  providers: [CasinoService, PrismaService],
  controllers: [CasinoController],
})
export class CasinoModule {}
