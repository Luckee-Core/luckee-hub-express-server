import { Request, Response } from 'express';

import { processListTerminalSessions } from '../process-list-terminal-sessions';

/**
 * GET /api/terminals — list active terminal sessions.
 */
export const listSessionsHandler = (_req: Request, res: Response): void => {
  console.log('📥 [terminals.listSessionsHandler] Request received');
  try {
    const sessions = processListTerminalSessions();
    console.log('✅ [terminals.listSessionsHandler] Sessions listed', { count: sessions.length });
    console.log('📤 [terminals.listSessionsHandler] Sending response', { statusCode: 200 });
    res.status(200).json({ success: true, data: sessions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [terminals.listSessionsHandler] Failed to list sessions', { message });
    res.status(500).json({ success: false, error: message });
  }
};
