import { Module } from '@nestjs/common';
import { AdminSupportController } from './support.controller';
import { AdminSupportService } from './support.service';
import { DbModule } from 'libs/db/src/db.module';

@Module({
  imports: [DbModule],
  controllers: [AdminSupportController],
  providers: [AdminSupportService],
})
export class AdminSupportModule {}
