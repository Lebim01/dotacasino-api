import { Module } from '@nestjs/common';
import { DepositsController } from './deposits.controller';
import { StdMexService } from '@domain/stdmex/stdmex.service';

@Module({
  controllers: [DepositsController],
  providers: [StdMexService],
})
export class DepositsModule {}
