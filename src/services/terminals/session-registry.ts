import type { TerminalRole, TerminalSessionRecord, TerminalSessionInfo } from './types';

const sessions = new Map<string, TerminalSessionRecord>();

/**
 * Register a terminal session in the in-memory registry.
 */
export const registerSession = (record: TerminalSessionRecord): void => {
  sessions.set(record.sessionId, record);
};

/**
 * Get a session by id.
 */
export const getSession = (sessionId: string): TerminalSessionRecord | undefined => {
  return sessions.get(sessionId);
};

/**
 * True when a studio already has a terminal tab for the given role.
 */
export const hasStudioRole = (studioId: string, role: TerminalRole): boolean => {
  return Array.from(sessions.values()).some(
    (record) => record.studioId === studioId && record.role === role,
  );
};

/**
 * List all active terminal sessions.
 */
export const listSessions = (): TerminalSessionInfo[] => {
  return Array.from(sessions.values()).map(({ sessionId, studioId, role, label }) => ({
    sessionId,
    studioId,
    role,
    label,
  }));
};

/**
 * Kill and remove a terminal session.
 */
export const killSession = (sessionId: string): boolean => {
  const record = sessions.get(sessionId);
  if (!record) {
    return false;
  }
  try {
    record.pty.kill();
  } catch {
    // process may already be dead
  }
  sessions.delete(sessionId);
  return true;
};

/**
 * Kill all sessions for a studio.
 */
export const killStudioSessions = (studioId: string): void => {
  for (const [sessionId, record] of sessions) {
    if (record.studioId === studioId) {
      killSession(sessionId);
    }
  }
};

/**
 * Kill all sessions on hub-express shutdown.
 */
export const killAllSessions = (): void => {
  for (const sessionId of Array.from(sessions.keys())) {
    killSession(sessionId);
  }
};
