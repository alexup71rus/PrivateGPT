import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { graphqlUploadExpress } from 'graphql-upload-ts';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(
    graphqlUploadExpress({ maxFileSize: 50 * 1024 * 1024, maxFiles: 10 }),
  );
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3002',
  });
  await app.listen(process.env.PORT || 3001);
}

bootstrap();
