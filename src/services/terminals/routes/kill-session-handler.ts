import { Request, Response } from 'express';

import { processKillTerminalSession } from '../process-kill-terminal-session';

/**
 * DELETE /api/terminals/:sessionId — kill a terminal session.
 */
export const killSessionHandler = (req: Request, res: Response): void => {
  const sessionId = Array.isArray(req.params.sessionId)
    ? req.params.sessionId[0]
    : req.params.sessionId;

  if (!sessionId) {
    res.status(400).json({ success: false, error: 'Session id required' });
    return;
  }

  console.log('📥 [terminals.killSessionHandler] Request received', { sessionId });
  try {
    const ok = processKillTerminalSession(sessionId);
    if (!ok) {
      console.log('📤 [terminals.killSessionHandler] Sending response', { statusCode: 400 });
      res.status(400).json({ success: false, error: 'Session not found' });
      return;
    }

    console.log('✅ [terminals.killSessionHandler] Session killed', { sessionId });
    console.log('📤 [terminals.killSessionHandler] Sending response', { statusCode: 200 });
    res.status(200).json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [terminals.killSessionHandler] Failed to kill session', { sessionId, message });
    res.status(500).json({ success: false, error: message });
  }
};
