import type { Request, Response } from 'express';

import { processSetupLocalDatabase } from '../process-setup-local-database';

/**
 * POST /api/projects/:id/local-database/setup — create DB, run migrations, upsert .env.
 */
export const setupLocalDatabaseHandler = async (req: Request, res: Response) => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!projectId) {
    return res.status(400).json({ success: false, error: 'Project id required' });
  }

  console.log('📥 [local-database.setupLocalDatabaseHandler] Request received', { projectId });
  try {
    const result = processSetupLocalDatabase(projectId);
    if ('error' in result) {
      console.log('📤 [local-database.setupLocalDatabaseHandler] Sending response', {
        statusCode: result.status,
      });
      return res.status(result.status).json({ success: false, error: result.error });
    }

    console.log('✅ [local-database.setupLocalDatabaseHandler] Setup complete', { projectId });
    console.log('📤 [local-database.setupLocalDatabaseHandler] Sending response', { statusCode: 200 });
    return res.status(200).json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to setup local database';
    console.error('❌ [local-database.setupLocalDatabaseHandler] Setup failed', { projectId, message });
    return res.status(500).json({ success: false, error: message });
  }
};
