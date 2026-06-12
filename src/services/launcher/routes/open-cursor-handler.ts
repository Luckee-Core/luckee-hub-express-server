import { Request, Response } from 'express';

import { processOpenCursor } from '../process-open-cursor';

/**
 * POST /api/launcher/studios/:id/open-cursor — open Cursor workspace.
 */
export const openCursorHandler = (req: Request, res: Response): void => {
  try {
    const studioId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!studioId) {
      res.status(400).json({ success: false, error: 'Studio id required' });
      return;
    }

    const ok = processOpenCursor(studioId);
    if (!ok) {
      res.status(400).json({ success: false, error: 'Studio not configured' });
      return;
    }

    res.status(200).json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ openCursorHandler:', message);
    res.status(500).json({ success: false, error: message });
  }
};
