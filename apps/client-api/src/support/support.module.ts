import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { DbModule } from 'libs/db/src/db.module';

@Module({
  imports: [DbModule],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
