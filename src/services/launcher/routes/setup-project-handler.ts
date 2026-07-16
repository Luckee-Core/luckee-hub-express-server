import { Request, Response } from 'express';

import { processSetupProject } from '../process-setup-project';

/**
 * POST /api/launcher/projects/:id/setup — clone repos and npm install (async job).
 */
export const setupProjectHandler = (req: Request, res: Response): void => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!projectId) {
    res.status(400).json({ success: false, error: 'Project id required' });
    return;
  }

  console.log('📥 [launcher.setupProjectHandler] Request received', { projectId });
  try {
    const result = processSetupProject(projectId);
    if ('error' in result) {
      console.log('📤 [launcher.setupProjectHandler] Sending response', { statusCode: 400 });
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    console.log('✅ [launcher.setupProjectHandler] Setup started', { projectId, jobId: result.jobId });
    console.log('📤 [launcher.setupProjectHandler] Sending response', { statusCode: 200 });
    res.status(200).json({
      success: true,
      data: {
        jobId: result.jobId,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [launcher.setupProjectHandler] Failed to start setup', { projectId, message });
    res.status(500).json({ success: false, error: message });
  }
};
