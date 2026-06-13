import { Request, Response } from 'express';

import { processRunProject } from '../process-run-project';

/**
 * POST /api/launcher/projects/:id/run — spawn project dev servers.
 */
export const runProjectHandler = (req: Request, res: Response): void => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!projectId) {
    res.status(400).json({ success: false, error: 'Project id required' });
    return;
  }

  console.log('📥 [launcher.runProjectHandler] Request received', { projectId });
  try {
    const result = processRunProject(projectId);
    if (!result) {
      console.log('📤 [launcher.runProjectHandler] Sending response', { statusCode: 400 });
      res.status(400).json({ success: false, error: 'Project not configured' });
      return;
    }

    console.log('✅ [launcher.runProjectHandler] Run started', { projectId, jobId: result.jobId });
    console.log('📤 [launcher.runProjectHandler] Sending response', { statusCode: 200 });
    res.status(200).json({
      success: true,
      data: {
        jobId: result.jobId,
        sessions: result.sessions ?? [],
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [launcher.runProjectHandler] Failed to run project', { projectId, message });
    res.status(500).json({ success: false, error: message });
  }
};
