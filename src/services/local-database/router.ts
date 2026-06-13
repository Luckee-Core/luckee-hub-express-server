import { Router } from 'express';

import { probeLocalDatabaseHandler } from './routes/probe-local-database-handler';
import { setupLocalDatabaseHandler } from './routes/setup-local-database-handler';

/**
 * Local database router factory — mounted under /api/projects/:id/local-database.
 */
export const createLocalDatabaseRouter = (): Router => {
  const router = Router({ mergeParams: true });
  router.get('/', probeLocalDatabaseHandler);
  router.post('/setup', setupLocalDatabaseHandler);
  return router;
};
