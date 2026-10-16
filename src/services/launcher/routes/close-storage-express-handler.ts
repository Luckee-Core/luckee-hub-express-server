import { Request, Response } from 'express';

import { processCloseStorageExpress } from '../process-close-storage-express';

/**
 * POST /api/launcher/projects/:id/close-storage-express — kill Storage Express terminal.
 */
export const closeStorageExpressHandler = (req: Request, res: Response): void => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!projectId) {
    res.status(400).json({ success: false, error: 'Project id required' });
    return;
  }

  console.log('📥 [launcher.closeStorageExpressHandler] Request received', { projectId });
  try {
    const result = processCloseStorageExpress(projectId);
    if ('error' in result) {
      console.log('📤 [launcher.closeStorageExpressHandler] Sending response', {
        statusCode: result.status,
      });
      res.status(result.status).json({ success: false, error: result.error });
      return;
    }

    console.log('✅ [launcher.closeStorageExpressHandler] Storage closed', { projectId });
    console.log('📤 [launcher.closeStorageExpressHandler] Sending response', { statusCode: 200 });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [launcher.closeStorageExpressHandler] Failed', { projectId, message });
    res.status(500).json({ success: false, error: message });
  }
};
