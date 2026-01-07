import { Module } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';

@Module({
  providers: [PrismaService],
  controllers: [],
  imports: [],
})
export class SoftGamingModule {}
