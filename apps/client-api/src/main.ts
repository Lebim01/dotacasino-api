import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { PrismaService } from 'libs/db/src/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: new RegExp(process.env.CORS_REGEX ?? '.*'),
    credentials: true,
  });

  const prisma = app.get(PrismaService);
  await prisma.enableShutdownHooks(app);

  await app.listen(
    process.env.PORT_CLIENT ? Number(process.env.PORT_CLIENT) : 3001,
  );
}
bootstrap();
