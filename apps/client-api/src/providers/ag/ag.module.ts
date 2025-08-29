import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AgService } from './ag.service';
import { AgController } from './ag.controller';

@Module({
  imports: [HttpModule],
  providers: [AgService],
  controllers: [AgController],
  exports: [AgService],
})
export class AgModule {}
