import dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';
import { json } from 'express';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use((req, _res, next) => {
    console.log(`[IN] ${req.method} ${req.originalUrl}`);
    next();
  });

  const prisma = app.get(PrismaService);
  await prisma.enableShutdownHooks(app);

  app.setGlobalPrefix('v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.use(json({ limit: '50mb' }));

  app.enableCors({
    origin: new RegExp(process.env.CORS_REGEX ?? '.*'),
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 204,
  });

  await app.listen(process.env.PORT_ADMIN ? Number(process.env.PORT_ADMIN) : 3002);
}
bootstrap();
