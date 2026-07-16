import { Router } from 'express';

import { closeProjectHandler } from './routes/close-project-handler';
import { getJobHandler } from './routes/get-job-handler';
import { openChromeHandler } from './routes/open-chrome-handler';
import { openCursorHandler } from './routes/open-cursor-handler';
import { runProjectHandler } from './routes/run-project-handler';
import { setupProjectHandler } from './routes/setup-project-handler';

/**
 * Launcher router factory.
 */
export const createLauncherRouter = (): Router => {
  const router = Router();
  router.post('/projects/:id/run', runProjectHandler);
  router.post('/projects/:id/setup', setupProjectHandler);
  router.post('/projects/:id/close', closeProjectHandler);
  router.post('/projects/:id/open-cursor', openCursorHandler);
  router.post('/projects/:id/open-chrome', openChromeHandler);
  router.get('/jobs/:jobId', getJobHandler);
  return router;
};
