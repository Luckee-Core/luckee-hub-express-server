import { Request, Response } from 'express';

import { processRestartStorageExpress } from '../process-restart-storage-express';

/**
 * POST /api/launcher/projects/:id/restart-storage-express — stop and start Storage Express.
 */
export const restartStorageExpressHandler = (req: Request, res: Response): void => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!projectId) {
    res.status(400).json({ success: false, error: 'Project id required' });
    return;
  }

  console.log('📥 [launcher.restartStorageExpressHandler] Request received', { projectId });
  try {
    const result = processRestartStorageExpress(projectId);
    if ('error' in result) {
      console.log('📤 [launcher.restartStorageExpressHandler] Sending response', {
        statusCode: result.status,
      });
      res.status(result.status).json({ success: false, error: result.error });
      return;
    }

    console.log('📤 [launcher.restartStorageExpressHandler] Sending response', { statusCode: 200 });
    res.status(200).json({
      success: true,
      data: { sessions: result.sessions, wasRunning: result.wasRunning },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [launcher.restartStorageExpressHandler] Failed', { projectId, message });
    res.status(500).json({ success: false, error: message });
  }
};
