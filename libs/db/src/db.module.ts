import { Global, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Global()
@Module({
  providers: [
    {
      provide: 'DB',
      useFactory: () => {
        const prisma = new PrismaClient();
        return prisma;
      },
    },
  ],
  exports: ['DB'],
})
export class DbModule {}
