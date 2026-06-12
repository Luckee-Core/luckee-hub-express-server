import path from 'path';

import { mergeStudioConfig, readLocalConfig, readRegistry } from '../../utils/studios';
import {
  findNextWebUrl,
  isExpressHealthy,
} from '../../utils/studios/wait-for-studio-ready';
import { hasStudioRole, listSessions } from './session-registry';
import { buildRunningStatusPtyCommand, spawnStudioPty } from './spawn-studio-pty';
import type { TerminalSessionInfo } from './types';

/**
 * Restore in-memory PTY sessions and open status tabs for studios already running on configured ports.
 */
export const processSyncTerminalSessions = (): TerminalSessionInfo[] => {
  console.log('🚀 Syncing terminal sessions with running studio ports...');

  const hubRoot = path.resolve(__dirname, '../../..');
  const registry = readRegistry(hubRoot);
  const localConfig = readLocalConfig(hubRoot);

  for (const entry of registry) {
    const local = localConfig.studios?.[entry.id];
    if (!local || local.enabled === false) {
      continue;
    }

    const merged = mergeStudioConfig(entry, localConfig);
    if (!merged) {
      continue;
    }

    if (!entry.webOnly && merged.expressDir) {
      const expressHealthy = isExpressHealthy(merged.apiPort, merged.healthPath);
      if (expressHealthy && !hasStudioRole(entry.id, 'express')) {
        spawnStudioPty({
          studioId: entry.id,
          role: 'express',
          label: `${entry.name} API`,
          command: buildRunningStatusPtyCommand(`${entry.name} API`, merged.apiPort, true),
          cwd: merged.expressDir,
          port: merged.apiPort,
        });
      }
    }

    if (!entry.apiOnly && merged.webDir) {
      const webUrl = findNextWebUrl(merged.webPortStart, 1);
      if (webUrl && !hasStudioRole(entry.id, 'web')) {
        const port = Number(new URL(webUrl).port) || merged.webPortStart;
        spawnStudioPty({
          studioId: entry.id,
          role: 'web',
          label: `${entry.name} Web`,
          command: buildRunningStatusPtyCommand(`${entry.name} Web`, port, true),
          cwd: merged.webDir,
          port,
        });
      }
    }
  }

  const sessions = listSessions();
  console.log(`✅ Terminal sync complete (${sessions.length} session(s))`);
  return sessions;
};
