import { Router } from 'express';

import { getProjectOverviewHandler } from './routes/get-project-overview-handler';

/**
 * Project overview router — mounted under /api/projects/:id/overview.
 */
export const createProjectOverviewRouter = (): Router => {
  const router = Router({ mergeParams: true });
  router.get('/', getProjectOverviewHandler);
  return router;
};
