import path from 'path';

import { mergeProjectConfig, readLocalConfig, readRegistry } from '../../utils/projects';
import { ensureProjectTerminalSessions } from './ensure-project-terminal-sessions';
import { ensureSchedulerWorkerLogSessions } from './ensure-scheduler-worker-log-sessions';
import { pruneStaleStatusSessions } from './prune-stale-status-sessions';
import { listSessions } from './session-registry';
import type { TerminalSessionInfo } from './types';

/**
 * Restore in-memory PTY sessions and open status tabs for projects already running on configured ports.
 */
export const processSyncTerminalSessions = async (): Promise<TerminalSessionInfo[]> => {
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

    pruneStaleStatusSessions(merged);
    ensureProjectTerminalSessions({
      entry,
      local,
      localConfig,
      orphan: true,
    });
  }

  const schedulerWorkerSessions = await ensureSchedulerWorkerLogSessions(hubRoot);
  if (schedulerWorkerSessions.length > 0) {
    console.log('✅ Attached scheduler worker log terminals', {
      count: schedulerWorkerSessions.length,
    });
  }

  const sessions = listSessions();
  console.log(`✅ Terminal sync complete (${sessions.length} session(s))`);
  return sessions;
};
