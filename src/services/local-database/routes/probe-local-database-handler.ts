import type { Request, Response } from 'express';

import { processProbeLocalDatabase } from '../process-probe-local-database';

/**
 * GET /api/projects/:id/local-database — probe Postgres setup status.
 */
export const probeLocalDatabaseHandler = async (req: Request, res: Response) => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!projectId) {
    return res.status(400).json({ success: false, error: 'Project id required' });
  }

  console.log('📥 [local-database.probeLocalDatabaseHandler] Request received', { projectId });
  try {
    const probe = processProbeLocalDatabase(projectId);
    console.log('✅ [local-database.probeLocalDatabaseHandler] Probe complete', { projectId });
    console.log('📤 [local-database.probeLocalDatabaseHandler] Sending response', { statusCode: 200 });
    return res.status(200).json({ success: true, data: probe });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to probe local database';
    console.error('❌ [local-database.probeLocalDatabaseHandler] Probe failed', { projectId, message });
    return res.status(500).json({ success: false, error: message });
  }
};
