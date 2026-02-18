import { Module } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import { NodePaymentsController } from './node-payments.controller';
import { NodePaymentsService } from './node-payments.service';

@Module({
  imports: [],
  controllers: [NodePaymentsController],
  providers: [
    NodePaymentsService,
    PrismaService,
  ],
  exports: [NodePaymentsService],
})
export class NodePaymentsModule { }
