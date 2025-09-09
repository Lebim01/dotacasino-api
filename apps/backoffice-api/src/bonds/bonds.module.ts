import { Module } from '@nestjs/common';
import { BondsService } from './bonds.service';
import { UsersService } from '../users/users.service';
import { BondsController } from './bonds.controller';

@Module({
  providers: [BondsService, UsersService],
  controllers: [BondsController],
})
export class BondsModule {}
