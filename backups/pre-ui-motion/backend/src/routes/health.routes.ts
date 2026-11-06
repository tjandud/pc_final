import { Router } from 'express';
import { configStatus } from '../config/env.js';
import { ok } from '../utils/apiResponse.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  ok(res, {
    status: 'ok',
    service: 'techcompare-backend',
    time: new Date().toISOString(),
    config: configStatus(), // booleans only, never secret values
  });
});
