import { Router } from 'express';

import { killSessionHandler } from './routes/kill-session-handler';
import { listSessionsHandler } from './routes/list-sessions-handler';
import { syncSessionsHandler } from './routes/sync-sessions-handler';

/**
 * Terminals HTTP router factory.
 */
export const createTerminalsRouter = (): Router => {
  const router = Router();
  router.get('/', listSessionsHandler);
  router.post('/sync', syncSessionsHandler);
  router.delete('/:sessionId', killSessionHandler);
  return router;
};
