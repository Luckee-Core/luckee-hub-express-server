import type { TerminalRole, TerminalSessionRecord, TerminalSessionInfo } from './types';

const sessions = new Map<string, TerminalSessionRecord>();

/** Roles the user closed. Sync will not open a replacement tab until the next Run. */
const suppressedRoles = new Set<string>();

const roleKey = (projectId: string, role: TerminalRole): string => `${projectId}:${role}`;

/**
 * Remember that the user closed this project role so sync does not reopen the tab.
 */
export const suppressRole = (projectId: string, role: TerminalRole): void => {
  suppressedRoles.add(roleKey(projectId, role));
};

/**
 * Remember that the user closed every terminal for this project.
 */
export const suppressProjectRoles = (projectId: string): void => {
  suppressRole(projectId, 'express');
  suppressRole(projectId, 'web');
  suppressRole(projectId, 'storage-express');
};

/**
 * Allow list Run to attach dispatcher and web terminals again.
 */
export const clearSuppressedRoles = (projectId: string): void => {
  suppressedRoles.delete(roleKey(projectId, 'express'));
  suppressedRoles.delete(roleKey(projectId, 'web'));
};

/**
 * Allow Start storage to attach the storage terminal again.
 */
export const clearSuppressedStorageExpressRole = (projectId: string): void => {
  suppressedRoles.delete(roleKey(projectId, 'storage-express'));
};

/**
 * True when the user closed this role and Run has not started again.
 */
export const isRoleSuppressed = (projectId: string, role: TerminalRole): boolean =>
  suppressedRoles.has(roleKey(projectId, role));

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
 * List all session records (including PTY, kind, and port).
 */
export const listSessionRecords = (): TerminalSessionRecord[] => {
  return Array.from(sessions.values());
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
 * Drop a registry entry when the PTY exits. Does not suppress the role.
 */
export const removeSession = (sessionId: string): void => {
  sessions.delete(sessionId);
};

/**
 * Kill and remove a terminal session.
 * `suppressRole` keeps sync from opening a replacement tab for that role.
 */
export const killSession = (sessionId: string, suppress = false): boolean => {
  const record = sessions.get(sessionId);
  if (!record) {
    return false;
  }
  if (suppress) {
    suppressRole(record.projectId, record.role);
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
  suppressProjectRoles(projectId);
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
