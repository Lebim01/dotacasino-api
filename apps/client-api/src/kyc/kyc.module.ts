import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { StorageService } from 'libs/storage/src/storage.service';

@Module({
  controllers: [KycController],
  providers: [KycService, StorageService],
})
export class KycModule {}
