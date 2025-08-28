import { Injectable, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUES } from '@queue/queue.module';

@Injectable()
export class SettlementProcessor implements OnModuleInit {
  onModuleInit() {
    const connection = new IORedis(process.env.REDIS_URL!);
    new Worker(
      QUEUES.BETS_SETTLEMENT,
      async (job) => {
        // TODO: lógica de liquidación
        console.log('Settling ticket', job.data);
      },
      { connection },
    );
  }
}
