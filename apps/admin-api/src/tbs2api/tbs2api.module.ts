import { Module } from '@nestjs/common';
import { Tbs2apiController } from './tbs2api.controller';

@Module({
  controllers: [Tbs2apiController],
  providers: [],
})
export class Tbs2apiModule {}
