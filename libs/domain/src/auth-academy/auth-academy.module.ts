import { Global, Module } from '@nestjs/common';
import { AuthAcademyService } from './auth-academy.service';
import { AuthAcademyController } from './auth-academy.controller';

@Global()
@Module({
  controllers: [AuthAcademyController],
  providers: [AuthAcademyService],
  exports: [AuthAcademyService],
})
export class AuthAcademyModule {}
