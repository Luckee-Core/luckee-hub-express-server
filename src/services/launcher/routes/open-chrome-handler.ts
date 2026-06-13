import { Request, Response } from 'express';

import { processOpenChrome } from '../process-open-chrome';

/**
 * POST /api/launcher/projects/:id/open-chrome — open Chrome for project web URL.
 */
export const openChromeHandler = (req: Request, res: Response): void => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!projectId) {
    res.status(400).json({ success: false, error: 'Project id required' });
    return;
  }

  console.log('📥 [launcher.openChromeHandler] Request received', { projectId });
  try {
    const ok = processOpenChrome(projectId);
    if (!ok) {
      console.log('📤 [launcher.openChromeHandler] Sending response', { statusCode: 400 });
      res.status(400).json({ success: false, error: 'Project not configured' });
      return;
    }

    console.log('✅ [launcher.openChromeHandler] Chrome opened', { projectId });
    console.log('📤 [launcher.openChromeHandler] Sending response', { statusCode: 200 });
    res.status(200).json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [launcher.openChromeHandler] Failed to open Chrome', { projectId, message });
    res.status(500).json({ success: false, error: message });
  }
};
