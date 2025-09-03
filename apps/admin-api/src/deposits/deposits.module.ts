import { Module } from '@nestjs/common';
import { DepositsController } from './deposits.controller';

@Module({
  controllers: [DepositsController],
  providers: [],
})
export class DepositsModule {}
