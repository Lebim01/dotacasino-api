import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';
import { UserCommonService } from '@domain/users/users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, AuthAcademyService, UserCommonService],
  imports: [],
})
export class UsersModule {}
