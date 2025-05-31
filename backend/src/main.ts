import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'node:path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useBodyParser('json', { limit: '10mb' });
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  });
  await app.listen(process.env.PORT || 3001);
}

bootstrap();
