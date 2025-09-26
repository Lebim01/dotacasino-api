import { Module } from '@nestjs/common';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';
import { UserCommonService } from '@domain/users/users.service';

@Module({
  controllers: [MembershipsController],
  providers: [MembershipsService, UserCommonService],
})
export class MembershipsModule {}
