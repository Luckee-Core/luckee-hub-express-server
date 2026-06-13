import { Request, Response } from 'express';

import { processSyncTerminalSessions } from '../process-sync-terminal-sessions';

/**
 * POST /api/terminals/sync — restore PTY sessions and detect running project ports.
 */
export const syncSessionsHandler = (_req: Request, res: Response): void => {
  console.log('📥 [terminals.syncSessionsHandler] Request received');
  try {
    const sessions = processSyncTerminalSessions();
    console.log('✅ [terminals.syncSessionsHandler] Sessions synced', { count: sessions.length });
    console.log('📤 [terminals.syncSessionsHandler] Sending response', { statusCode: 200 });
    res.status(200).json({ success: true, data: sessions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [terminals.syncSessionsHandler] Failed to sync sessions', { message });
    res.status(500).json({ success: false, error: message });
  }
};
