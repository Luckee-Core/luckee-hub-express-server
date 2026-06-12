import { Request, Response } from 'express';

import { killSession } from '../session-registry';

/**
 * DELETE /api/terminals/:sessionId — kill a terminal session.
 */
export const killSessionHandler = (req: Request, res: Response): void => {
  try {
    const sessionId = Array.isArray(req.params.sessionId)
      ? req.params.sessionId[0]
      : req.params.sessionId;
    if (!sessionId) {
      res.status(400).json({ success: false, error: 'Session id required' });
      return;
    }

    const ok = killSession(sessionId);
    if (!ok) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    res.status(200).json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ killSessionHandler:', message);
    res.status(500).json({ success: false, error: message });
  }
};
