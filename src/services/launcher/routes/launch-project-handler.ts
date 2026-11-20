import { Request, Response } from 'express';

import { processLaunchProject } from '../process-launch-project';

/**
 * POST /api/launcher/projects/:id/launch — live web origin, or start the project (ADR 035).
 */
export const launchProjectHandler = (req: Request, res: Response): void => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!projectId) {
    res.status(400).json({ success: false, error: 'Project id required' });
    return;
  }

  console.log('📥 [launcher.launchProjectHandler] Request received', { projectId });
  try {
    const result = processLaunchProject(projectId);
    if ('error' in result) {
      console.log('📤 [launcher.launchProjectHandler] Sending response', {
        statusCode: result.status,
        error: result.error,
      });
      res.status(result.status).json({ success: false, error: result.error });
      return;
    }

    console.log('📤 [launcher.launchProjectHandler] Sending response', {
      statusCode: 200,
      status: result.status,
    });
    res.status(200).json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [launcher.launchProjectHandler] Failed to launch project', {
      projectId,
      message,
    });
    res.status(500).json({ success: false, error: message });
  }
};
