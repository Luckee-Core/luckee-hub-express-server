import { Router } from 'express';

import { createLocalDatabaseRouter } from '../local-database';
import { getHubConfigHandler } from './routes/get-hub-config-handler';
import { listProjectsHandler } from './routes/list-projects-handler';
import { pickHubConfigFolderHandler } from './routes/pick-hub-config-folder-handler';
import { putHubConfigHandler } from './routes/put-hub-config-handler';

/**
 * Projects router factory.
 */
export const createProjectsRouter = (): Router => {
  const router = Router();
  router.get('/', listProjectsHandler);
  router.get('/hub-config', getHubConfigHandler);
  router.put('/hub-config', putHubConfigHandler);
  router.post('/hub-config/pick-folder', pickHubConfigFolderHandler);
  router.use('/:id/local-database', createLocalDatabaseRouter());
  return router;
};
