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
 * True when a project already has a terminal tab for the given role.
 */
export const hasProjectRole = (projectId: string, role: TerminalRole): boolean => {
  return Array.from(sessions.values()).some(
    (record) => record.projectId === projectId && record.role === role,
  );
};

/**
 * List all active terminal sessions.
 */
export const listSessions = (): TerminalSessionInfo[] => {
  return Array.from(sessions.values()).map(({ sessionId, projectId, role, label }) => ({
    sessionId,
    projectId,
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
 * Kill all sessions for a project.
 */
export const killProjectSessions = (projectId: string): void => {
  for (const [sessionId, record] of sessions) {
    if (record.projectId === projectId) {
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
