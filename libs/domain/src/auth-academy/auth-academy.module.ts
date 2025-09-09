import { Global, Module } from '@nestjs/common';
import { AuthAcademyService } from './auth-academy.service';

@Global()
@Module({
  providers: [AuthAcademyService],
  exports: [AuthAcademyService],
})
export class AuthAcademyModule {}
