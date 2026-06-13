import path from 'path';

import { mergeProjectConfig, readLocalConfig, readRegistry } from '../../utils/projects';
import {
  findNextWebUrl,
  isExpressHealthy,
} from '../../utils/projects/wait-for-project-ready';
import { hasProjectRole, listSessions } from './session-registry';
import { buildRunningStatusPtyCommand, spawnProjectPty } from './spawn-project-pty';
import type { TerminalSessionInfo } from './types';

/**
 * Restore in-memory PTY sessions and open status tabs for projects already running on configured ports.
 */
export const processSyncTerminalSessions = (): TerminalSessionInfo[] => {
  console.log('🚀 Syncing terminal sessions with running project ports...');

  const hubRoot = path.resolve(__dirname, '../../..');
  const registry = readRegistry(hubRoot);
  const localConfig = readLocalConfig(hubRoot);

  for (const entry of registry) {
    const local = localConfig.projects?.[entry.id];
    if (!local || local.enabled === false) {
      continue;
    }

    const merged = mergeProjectConfig(entry, localConfig);
    if (!merged) {
      continue;
    }

    if (!entry.webOnly && merged.expressDir) {
      const expressHealthy = isExpressHealthy(merged.apiPort, merged.healthPath);
      if (expressHealthy && !hasProjectRole(entry.id, 'express')) {
        spawnProjectPty({
          projectId: entry.id,
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
      if (webUrl && !hasProjectRole(entry.id, 'web')) {
        const port = Number(new URL(webUrl).port) || merged.webPortStart;
        spawnProjectPty({
          projectId: entry.id,
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
