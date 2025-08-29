import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: new RegExp(process.env.CORS_REGEX ?? '.*'),
    credentials: true,
  });


  app.use(bodyParser.text({ type: ['text/xml', 'application/xml'] }));

  // --- Swagger sólo si está habilitado o no es producción ---
  const swaggerEnabled =
    process.env.SWAGGER_ENABLED === 'true' ||
    process.env.NODE_ENV !== 'production';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Casino Client API')
      .setDescription(
        'Endpoints para client-side (auth, profile, games, bets, etc.)',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      ignoreGlobalPrefix: false, // respeta /v1
    });

    // UI en /v1/docs y JSON en /v1/docs-json
    SwaggerModule.setup('v1/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(
    process.env.PORT_CLIENT ? Number(process.env.PORT_CLIENT) : 3001,
  );
}
bootstrap();
