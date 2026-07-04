import { Request, Response } from 'express';

import { processCloseProject } from '../process-close-project';

/**
 * POST /api/launcher/projects/:id/close — kill dev servers and stop Postgres when idle.
 */
export const closeProjectHandler = (req: Request, res: Response): void => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!projectId) {
    res.status(400).json({ success: false, error: 'Project id required' });
    return;
  }

  console.log('📥 [launcher.closeProjectHandler] Request received', { projectId });
  try {
    const result = processCloseProject(projectId);
    if ('error' in result) {
      console.log('📤 [launcher.closeProjectHandler] Sending response', {
        statusCode: result.status,
      });
      res.status(result.status).json({ success: false, error: result.error });
      return;
    }

    console.log('✅ [launcher.closeProjectHandler] Project closed', { projectId });
    console.log('📤 [launcher.closeProjectHandler] Sending response', { statusCode: 200 });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [launcher.closeProjectHandler] Failed to close project', { projectId, message });
    res.status(500).json({ success: false, error: message });
  }
};
