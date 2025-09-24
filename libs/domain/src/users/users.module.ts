import { Global, Module } from '@nestjs/common';
import { UserCommonService } from './users.service';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';
import { PrismaService } from 'libs/db/src/prisma.service';
import { DisruptiveService } from '@domain/disruptive/disruptive.service';

@Global()
@Module({
  imports: [PrismaService],
  providers: [UserCommonService, AuthAcademyService, DisruptiveService],
  exports: [UserCommonService],
})
export class UserCommonModule {}
