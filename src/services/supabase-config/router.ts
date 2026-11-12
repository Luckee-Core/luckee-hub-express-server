import { Router } from 'express';

import { probeSupabaseConfigHandler } from './routes/probe-supabase-config-handler';
import { saveSupabaseConfigHandler } from './routes/save-supabase-config-handler';

/**
 * Supabase config router — mounted under /api/projects/:id/supabase.
 */
export const createSupabaseConfigRouter = (): Router => {
  const router = Router({ mergeParams: true });
  router.get('/', probeSupabaseConfigHandler);
  router.post('/config', saveSupabaseConfigHandler);
  return router;
};
