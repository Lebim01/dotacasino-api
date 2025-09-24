import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedCotroller } from './seed.controller';
import { UserCommonService } from '@domain/users/users.service';
import { PrismaService } from 'libs/db/src/prisma.service';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';
import { DisruptiveService } from '@domain/disruptive/disruptive.service';
import { CasinoService } from '@domain/casino/casino.service';

@Module({
  imports: [],
  providers: [
    SeedService,
    UserCommonService,
    PrismaService,
    AuthAcademyService,
    DisruptiveService,
    CasinoService,
  ],
  exports: [SeedService],
  controllers: [SeedCotroller],
})
export class SeedModule {}
