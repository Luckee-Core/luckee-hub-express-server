import { Router } from 'express';

import { createLocalDatabaseRouter } from '../local-database';
import { listProjectsHandler } from './routes/list-projects-handler';

/**
 * Projects router factory.
 */
export const createProjectsRouter = (): Router => {
  const router = Router();
  router.get('/', listProjectsHandler);
  router.use('/:id/local-database', createLocalDatabaseRouter());
  return router;
};
