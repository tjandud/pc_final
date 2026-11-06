import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.routes.js';
import { createCatalogRouter } from './routes/catalog.routes.js';
import { errorHandler, notFound } from './middlewares/error.middleware.js';
import type { CatalogService } from './services/catalog.service.js';

export function createApp(catalogService?: CatalogService) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()) }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1', createCatalogRouter(catalogService));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
