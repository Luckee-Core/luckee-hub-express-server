import { Router } from 'express';

import { getSystemMetricsHandler } from './routes/get-system-metrics-handler';

/**
 * System metrics router factory (CPU/GPU on Apple Silicon).
 */
export const createSystemMetricsRouter = (): Router => {
  const router = Router();
  router.get('/', getSystemMetricsHandler);
  return router;
};
