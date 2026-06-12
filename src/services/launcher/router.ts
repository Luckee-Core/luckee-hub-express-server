import { Router } from 'express';

import { getJobHandler } from './routes/get-job-handler';
import { openChromeHandler } from './routes/open-chrome-handler';
import { openCursorHandler } from './routes/open-cursor-handler';
import { runStudioHandler } from './routes/run-studio-handler';

/**
 * Launcher router factory.
 */
export const createLauncherRouter = (): Router => {
  const router = Router();
  router.post('/studios/:id/run', runStudioHandler);
  router.post('/studios/:id/open-cursor', openCursorHandler);
  router.post('/studios/:id/open-chrome', openChromeHandler);
  router.get('/jobs/:jobId', getJobHandler);
  return router;
};
