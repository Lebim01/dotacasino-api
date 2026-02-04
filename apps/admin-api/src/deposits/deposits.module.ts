import { Module } from '@nestjs/common';
import { DepositsController } from './deposits.controller';
import { StdMexService } from '@domain/stdmex/stdmex.service';
import { HttpModule } from '@nestjs/axios';
import { FxService } from '@domain/fx/fx.service';
import { UsersService } from 'apps/client-api/src/users/users.service';
import { PrismaService } from 'libs/db/src/prisma.service';
import { NodePaymentsService } from '@domain/node-payments/node-payments.service';

@Module({
  imports: [HttpModule],
  controllers: [DepositsController],
  providers: [StdMexService, FxService, UsersService, PrismaService, NodePaymentsService],
})
export class DepositsModule {}
