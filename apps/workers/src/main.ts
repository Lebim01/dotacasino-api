import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  console.log('Workers up on port', process.env.PORT_WORKERS ?? 3003);
}
bootstrap();
