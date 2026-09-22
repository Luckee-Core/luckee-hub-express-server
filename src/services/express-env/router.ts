import { Router } from 'express';

import { probeExpressEnvGroupHandler } from './routes/probe-express-env-group-handler';
import { saveExpressEnvGroupHandler } from './routes/save-express-env-group-handler';

/**
 * Express env group router — mounted under /api/projects/:id/express-env.
 */
export const createExpressEnvRouter = (): Router => {
  const router = Router({ mergeParams: true });
  router.get('/:groupId', probeExpressEnvGroupHandler);
  router.post('/:groupId', saveExpressEnvGroupHandler);
  return router;
};
