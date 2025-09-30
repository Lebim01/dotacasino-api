import { Module } from '@nestjs/common';
import { GitslotparkController } from './gitslotpark.controller';

@Module({
  controllers: [GitslotparkController],
  providers: [],
})
export class GitslotparkModule {}
