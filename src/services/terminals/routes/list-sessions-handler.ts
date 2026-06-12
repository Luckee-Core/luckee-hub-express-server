import { Request, Response } from 'express';

import { listSessions } from '../session-registry';

/**
 * GET /api/terminals — list active terminal sessions.
 */
export const listSessionsHandler = (_req: Request, res: Response): void => {
  try {
    const sessions = listSessions();
    res.status(200).json({ success: true, data: sessions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ listSessionsHandler:', message);
    res.status(500).json({ success: false, error: message });
  }
};
