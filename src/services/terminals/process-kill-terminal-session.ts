import { killSession } from './session-registry';

/**
 * Kill a terminal session by id.
 */
export const processKillTerminalSession = (sessionId: string): boolean => {
  return killSession(sessionId);
};
