import {
  getStorageExpressRegistryRepo,
  killPortListenersOwnedByDir,
  mergeProjectConfig,
  projectHasStorageExpressRepo,
  readLocalConfig,
  readRegistry,
  waitForPortRelease,
} from '../../utils/projects';
import { getHubRoot } from '../../utils/projects/get-hub-root';
import { killSession, listSessionRecords, suppressRole } from '../terminals/session-registry';

export type CloseStorageExpressResult = {
  killedSessionIds: string[];
  killedListenerCount: number;
  message: string;
};

/**
 * Stop Storage Express for a project: kill hub terminal sessions, then any listener on the
 * storage port whose cwd is under the storage repo (covers servers started outside the hub,
 * and nodemon/ts-node children that survive the PTY being killed).
 */
export const processCloseStorageExpress = (
  projectId: string,
): CloseStorageExpressResult | { error: string; status: 400 } => {
  console.log('🚀 [launcher.processCloseStorageExpress] Closing storage', { projectId });

  const hubRoot = getHubRoot();
  const registry = readRegistry(hubRoot);
  const entry = registry.find((project) => project.id === projectId);
  if (!entry || !projectHasStorageExpressRepo(entry)) {
    return { error: 'Project has no Storage Express repo', status: 400 };
  }

  const sessionIds = listSessionRecords()
    .filter(
      (record) => record.projectId === projectId && record.role === 'storage-express',
    )
    .map((record) => record.sessionId);

  suppressRole(projectId, 'storage-express');
  for (const sessionId of sessionIds) {
    killSession(sessionId, true);
  }

  const merged = mergeProjectConfig(entry, readLocalConfig(hubRoot));
  const storagePort = getStorageExpressRegistryRepo(entry)?.defaultApiPort ?? 3010;
  let killedListenerCount = 0;
  if (merged?.storageExpressDir && storagePort > 0) {
    killedListenerCount = killPortListenersOwnedByDir(storagePort, merged.storageExpressDir);
    if (killedListenerCount > 0 || sessionIds.length > 0) {
      waitForPortRelease(storagePort);
    }
  }

  if (sessionIds.length === 0 && killedListenerCount === 0) {
    return { error: 'Storage Express is not running for this project', status: 400 };
  }

  const parts: string[] = [];
  if (sessionIds.length > 0) {
    parts.push(`closed ${sessionIds.length} terminal session(s)`);
  }
  if (killedListenerCount > 0) {
    parts.push(`stopped ${killedListenerCount} process(es) on port ${storagePort}`);
  }
  const message = `Storage Express: ${parts.join(', ')}`;
  console.log('✅ [launcher.processCloseStorageExpress] Complete', {
    projectId,
    sessionIds,
    killedListenerCount,
  });

  return { killedSessionIds: sessionIds, killedListenerCount, message };
};
