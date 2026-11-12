import { Router } from 'express';

import { getDataPlaneHandler } from './routes/get-data-plane-handler';
import { getProjectEnvHandler } from './routes/get-project-env-handler';
import { postDataPlaneHandler } from './routes/post-data-plane-handler';
import { postProjectEnvHandler } from './routes/post-project-env-handler';

/**
 * Per-repo env and data-plane routes — mounted under /api/projects/:id.
 */
export const createProjectEnvRouter = (): Router => {
  const router = Router({ mergeParams: true });
  router.get('/env', getProjectEnvHandler);
  router.post('/env', postProjectEnvHandler);
  router.get('/data-plane', getDataPlaneHandler);
  router.post('/data-plane', postDataPlaneHandler);
  return router;
};
