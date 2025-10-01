import {
  INestApplication,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

var globalThis: any;
let prismaGlobal: PrismaClient; // singleton en dev

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // si ya existe en global, reusar
    if (process.env.NODE_ENV !== 'production') {
      if (!globalThis?.__PRISMA__) {
        globalThis = { __PRISMA__: new PrismaClient() };
      }
      prismaGlobal = globalThis?.__PRISMA__;
      super(); // inicializa el super para Nest
      Object.assign(this, prismaGlobal); // clona métodos a la clase
    } else {
      super();
    }
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    if (process.env.NODE_ENV === 'production') {
      await this.$disconnect();
    }
    // en dev, no desconectamos para mantener el singleton vivo
  }

  // Cierra Nest cuando Prisma emite beforeExit (útil en workers/CLI)
  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
