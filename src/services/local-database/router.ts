import { Router } from 'express';

import { cleanupLocalDatabaseHandler } from './routes/cleanup-local-database-handler';
import { probeLocalDatabaseHandler } from './routes/probe-local-database-handler';
import { runLocalDatabaseStepHandler } from './routes/run-local-database-step-handler';
import { setupLocalDatabaseHandler } from './routes/setup-local-database-handler';

/**
 * Local database router factory — mounted under /api/projects/:id/local-database.
 */
export const createLocalDatabaseRouter = (): Router => {
  const router = Router({ mergeParams: true });
  router.get('/', probeLocalDatabaseHandler);
  router.post('/setup', setupLocalDatabaseHandler);
  router.post('/cleanup', cleanupLocalDatabaseHandler);
  router.post('/steps/:stepId/run', runLocalDatabaseStepHandler);
  return router;
};
