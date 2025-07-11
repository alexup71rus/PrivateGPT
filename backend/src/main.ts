import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { graphqlUploadExpress } from 'graphql-upload-ts';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { IncomingMessage, ServerResponse } from 'http';
import { SettingsService } from './settings/settings.service';

async function bootstrap() {
  const isElectron = process.versions.electron !== undefined;
  let basePath: string;
  try {
    const { app } = await import('electron');
    basePath = isElectron ? app.getPath('userData') : process.cwd();
  } catch {
    basePath = process.cwd();
  }

  const nestApp = await NestFactory.create<NestExpressApplication>(AppModule);
  const settingsService = nestApp.get(SettingsService);

  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3002')
    .split(',')
    .map((s) => s.trim());

  nestApp.use(
    '/api',
    async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      if (req.method === 'OPTIONS') {
        const origin =
          req.headers.origin && allowedOrigins.includes(req.headers.origin)
            ? req.headers.origin
            : allowedOrigins[0];
        res
          .writeHead(204, {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
            'Access-Control-Allow-Headers': '*',
          })
          .end();
        return;
      }

      const settingsEntity = await settingsService.getSettings();
      const ollamaUrl = settingsEntity.settings.ollamaURL;

      if (!ollamaUrl) {
        res.writeHead(400).end('Missing ollamaURL in settings');
        return;
      }

      try {
        new URL(ollamaUrl);
      } catch (err: any) {
        res.writeHead(400).end(`Invalid ollamaURL: ${err.message}`);
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
            delete proxyRes.headers['access-control-allow-origin'];
          },
          error: (err, _req, res: ServerResponse) => {
            res.writeHead(500).end('Proxy error');
          },
        },
      });

      proxy(req, res, next);
    },
  );

  nestApp.use(
    graphqlUploadExpress({ maxFileSize: 50 * 1024 * 1024, maxFiles: 10 }),
  );
  nestApp.useStaticAssets(join(basePath, 'Uploads'), { prefix: '/uploads' });
  nestApp.enableCors({ origin: allowedOrigins });

  const port = parseInt(process.env.PORT || '3001', 10);
  await nestApp.listen(port);
}

bootstrap();
