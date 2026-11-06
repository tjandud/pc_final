import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.routes.js';
import { errorHandler, notFound } from './middlewares/error.middleware.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()) }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/v1/health', healthRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
