import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedCotroller } from './seed.controller';
import { UserCommonService } from '@domain/users/users.service';
import { PrismaService } from 'libs/db/src/prisma.service';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';

@Module({
  imports: [],
  providers: [
    SeedService,
    UserCommonService,
    PrismaService,
    AuthAcademyService,
  ],
  exports: [SeedService],
  controllers: [SeedCotroller],
})
export class SeedModule {}
