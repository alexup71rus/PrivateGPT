import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { graphqlUploadExpress } from 'graphql-upload-ts';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { ServerResponse } from 'http';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3002')
    .split(',')
    .map((s) => s.trim());
  const defaultOllamaUrl =
    process.env.OLLAMA_URL || 'http://192.168.0.126:11434';

  app.use('/api', (req, res, next) => {
    const ollamaUrl = req.headers['x-ollama-url'] || defaultOllamaUrl;

    if (req.method === 'OPTIONS') {
      const origin =
        req.headers.origin && allowedOrigins.includes(req.headers.origin)
          ? req.headers.origin
          : allowedOrigins[0];
      res
        .status(204)
        .set({
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
          'Access-Control-Allow-Headers': '*',
        })
        .end();
      return;
    }

    try {
      new URL(ollamaUrl);
    } catch (err) {
      console.error(
        `Invalid x-ollama-url: ${ollamaUrl}, Error: ${err.message}`,
      );
      res.status(400).send('Invalid x-ollama-url');
      return;
    }

    const proxy = createProxyMiddleware({
      target: ollamaUrl,
      changeOrigin: true,
      pathRewrite: (path) => `/api${path.replace(/^\/api/, '')}`,
      on: {
        proxyRes: (proxyRes, req) => {
          const origin =
            req.headers.origin && allowedOrigins.includes(req.headers.origin)
              ? req.headers.origin
              : allowedOrigins[0];
          proxyRes.headers['Access-Control-Allow-Origin'] = origin;
          proxyRes.headers['Access-Control-Allow-Methods'] =
            'GET, POST, OPTIONS, PUT, DELETE';
          proxyRes.headers['Access-Control-Allow-Headers'] = '*';
        },
        error: (err, req, res: ServerResponse) => {
          console.error(`Proxy error: ${err.message}`);
          res.statusCode = 500;
          res.end('Proxy error');
        },
      },
    });

    proxy(req, res, next);
  });

  app.use(
    graphqlUploadExpress({ maxFileSize: 50 * 1024 * 1024, maxFiles: 10 }),
  );
  app.useStaticAssets(join(process.cwd(), 'Uploads'), { prefix: '/Uploads' });
  app.enableCors({ origin: allowedOrigins });

  const port = process.env.PORT || 3001;
  await app.listen(port);
}

bootstrap();
