import { Global, Module } from '@nestjs/common';
import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

export const QUEUES = {
  PAYMENTS_CONFIRM: 'payments:confirm',
  BETS_SETTLEMENT: 'bets:settlement',
  REPORTS_DAILY: 'reports:daily',
} as const;

const connection = new IORedis(process.env.REDIS_URL!);

@Global()
@Module({
  providers: [
    { provide: 'REDIS', useValue: connection },
    {
      provide: 'Q_PAYMENTS',
      useFactory: () => new Queue(QUEUES.PAYMENTS_CONFIRM, { connection }),
    },
    {
      provide: 'Q_BETS',
      useFactory: () => new Queue(QUEUES.BETS_SETTLEMENT, { connection }),
    },
    {
      provide: 'Q_REPORTS',
      useFactory: () => new Queue(QUEUES.REPORTS_DAILY, { connection }),
    },
    {
      provide: 'Q_EVENTS',
      useFactory: () => new QueueEvents(QUEUES.BETS_SETTLEMENT, { connection }),
    },
  ],
  exports: ['REDIS', 'Q_PAYMENTS', 'Q_BETS', 'Q_REPORTS', 'Q_EVENTS'],
})
export class QueueModule {}
