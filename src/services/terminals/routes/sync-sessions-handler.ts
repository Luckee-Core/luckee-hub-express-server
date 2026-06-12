import { Request, Response } from 'express';

import { processSyncTerminalSessions } from '../process-sync-terminal-sessions';

/**
 * POST /api/terminals/sync — restore PTY sessions and detect running studio ports.
 */
export const syncSessionsHandler = (_req: Request, res: Response): void => {
  try {
    const sessions = processSyncTerminalSessions();
    res.status(200).json({ success: true, data: sessions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ syncSessionsHandler:', message);
    res.status(500).json({ success: false, error: message });
  }
};
