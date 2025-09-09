import { Module } from '@nestjs/common';
import { AcademyService } from './academy.service';
import { AcademyController } from './academy.controller';

@Module({
  providers: [AcademyService],
  controllers: [AcademyController]
})
export class AcademyModule {}
