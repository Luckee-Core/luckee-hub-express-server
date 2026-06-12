import { Router } from 'express';

import { listStudiosHandler } from './routes/list-studios-handler';

/**
 * Studios router factory.
 */
export const createStudiosRouter = (): Router => {
  const router = Router();
  router.get('/', listStudiosHandler);
  return router;
};
