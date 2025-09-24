import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';
import { UserCommonService } from '@domain/users/users.service';
import { DisruptiveService } from '@domain/disruptive/disruptive.service';
import { CasinoService } from '@domain/casino/casino.service';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    AuthAcademyService,
    UserCommonService,
    DisruptiveService,
    CasinoService,
  ],
  imports: [],
})
export class UsersModule {}
