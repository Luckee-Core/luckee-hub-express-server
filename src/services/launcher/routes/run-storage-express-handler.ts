import { Request, Response } from 'express';

import { processRunStorageExpress } from '../process-run-storage-express';

/**
 * POST /api/launcher/projects/:id/run-storage-express — spawn Storage Express dev server.
 */
export const runStorageExpressHandler = (req: Request, res: Response): void => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!projectId) {
    res.status(400).json({ success: false, error: 'Project id required' });
    return;
  }

  console.log('📥 [launcher.runStorageExpressHandler] Request received', { projectId });
  try {
    const result = processRunStorageExpress(projectId);
    if ('error' in result) {
      console.log('📤 [launcher.runStorageExpressHandler] Sending response', {
        statusCode: result.status,
      });
      res.status(result.status).json({ success: false, error: result.error });
      return;
    }

    console.log('✅ [launcher.runStorageExpressHandler] Storage started', { projectId });
    console.log('📤 [launcher.runStorageExpressHandler] Sending response', { statusCode: 200 });
    res.status(200).json({
      success: true,
      data: { sessions: result.sessions },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [launcher.runStorageExpressHandler] Failed', { projectId, message });
    res.status(500).json({ success: false, error: message });
  }
};
