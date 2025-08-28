import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Opcional: restringir por IP en reverse proxy
  await app.listen(
    process.env.PORT_ADMIN ? Number(process.env.PORT_ADMIN) : 3002,
  );
}
bootstrap();
