import type { Request, Response } from 'express';

import { processCleanupLocalDatabase } from '../process-cleanup-local-database';

/**
 * POST /api/projects/:id/local-database/cleanup — stop hub-managed Postgres on tab close.
 */
export const cleanupLocalDatabaseHandler = async (req: Request, res: Response) => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!projectId) {
    return res.status(400).json({ success: false, error: 'Project id required' });
  }

  console.log('📥 [local-database.cleanupLocalDatabaseHandler] Request received', { projectId });

  try {
    const result = processCleanupLocalDatabase(projectId);
    if ('error' in result) {
      console.log('📤 [local-database.cleanupLocalDatabaseHandler] Sending response', {
        statusCode: result.status,
      });
      return res.status(result.status).json({ success: false, error: result.error });
    }

    console.log('✅ [local-database.cleanupLocalDatabaseHandler] Cleanup complete', { projectId });
    console.log('📤 [local-database.cleanupLocalDatabaseHandler] Sending response', { statusCode: 200 });
    return res.status(200).json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to cleanup local database';
    console.error('❌ [local-database.cleanupLocalDatabaseHandler] Cleanup failed', {
      projectId,
      message,
    });
    return res.status(500).json({ success: false, error: message });
  }
};
