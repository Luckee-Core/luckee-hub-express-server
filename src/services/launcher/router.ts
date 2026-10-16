import { Router } from 'express';

import { closeProjectHandler } from './routes/close-project-handler';
import { closeStorageExpressHandler } from './routes/close-storage-express-handler';
import { getJobHandler } from './routes/get-job-handler';
import { openChromeHandler } from './routes/open-chrome-handler';
import { openCursorHandler } from './routes/open-cursor-handler';
import { runProjectHandler } from './routes/run-project-handler';
import { runStorageExpressHandler } from './routes/run-storage-express-handler';
import { setupProjectHandler } from './routes/setup-project-handler';

/**
 * Launcher router factory.
 */
export const createLauncherRouter = (): Router => {
  const router = Router();
  router.post('/projects/:id/run', runProjectHandler);
  router.post('/projects/:id/run-storage-express', runStorageExpressHandler);
  router.post('/projects/:id/setup', setupProjectHandler);
  router.post('/projects/:id/close', closeProjectHandler);
  router.post('/projects/:id/close-storage-express', closeStorageExpressHandler);
  router.post('/projects/:id/open-cursor', openCursorHandler);
  router.post('/projects/:id/open-chrome', openChromeHandler);
  router.get('/jobs/:jobId', getJobHandler);
  return router;
};
