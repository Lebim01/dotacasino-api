import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthAcademyService } from '@domain/auth-academy/auth-academy.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, AuthAcademyService],
  imports: [],
})
export class UsersModule {}
