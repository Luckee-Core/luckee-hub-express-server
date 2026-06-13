import { listSessions } from './session-registry';
import type { TerminalSessionInfo } from './types';

/**
 * List all active terminal sessions from the in-memory registry.
 */
export const processListTerminalSessions = (): TerminalSessionInfo[] => {
  return listSessions();
};
