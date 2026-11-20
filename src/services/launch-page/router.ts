import { Router } from 'express';

import { getLaunchPageHandler } from './routes/get-launch-page-handler';

/**
 * Launch page router factory (mounted at `/launch`, ADR 035).
 */
export const createLaunchPageRouter = (): Router => {
  const router = Router();
  router.get('/:projectId', getLaunchPageHandler);
  return router;
};
