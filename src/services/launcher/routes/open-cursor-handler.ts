import { Request, Response } from 'express';

import { processOpenCursor } from '../process-open-cursor';

/**
 * POST /api/launcher/projects/:id/open-cursor — open Cursor workspace.
 */
export const openCursorHandler = (req: Request, res: Response): void => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!projectId) {
    res.status(400).json({ success: false, error: 'Project id required' });
    return;
  }

  console.log('📥 [launcher.openCursorHandler] Request received', { projectId });
  try {
    const ok = processOpenCursor(projectId);
    if (!ok) {
      console.log('📤 [launcher.openCursorHandler] Sending response', { statusCode: 400 });
      res.status(400).json({ success: false, error: 'Project not configured' });
      return;
    }

    console.log('✅ [launcher.openCursorHandler] Cursor opened', { projectId });
    console.log('📤 [launcher.openCursorHandler] Sending response', { statusCode: 200 });
    res.status(200).json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [launcher.openCursorHandler] Failed to open Cursor', { projectId, message });
    res.status(500).json({ success: false, error: message });
  }
};
