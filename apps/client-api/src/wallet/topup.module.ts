import { Module } from '@nestjs/common';
import { TopupController } from './topup.controller';
import { TopupService } from './topup.service';

@Module({
  controllers: [TopupController],
  providers: [TopupService],
})
export class TopupModule {}
