import { projectHasStorageExpressRepo, readRegistry } from '../../utils/projects';
import { getHubRoot } from '../../utils/projects/get-hub-root';
import { killSession, listSessionRecords, suppressRole } from '../terminals/session-registry';

export type CloseStorageExpressResult = {
  killedSessionIds: string[];
  message: string;
};

/**
 * Kill Storage Express terminal sessions for a project.
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

  if (sessionIds.length === 0) {
    suppressRole(projectId, 'storage-express');
    return { error: 'No active Storage Express terminal for this project', status: 400 };
  }

  for (const sessionId of sessionIds) {
    killSession(sessionId, true);
  }

  const message = `Closed ${sessionIds.length} Storage Express terminal session(s)`;
  console.log('✅ [launcher.processCloseStorageExpress] Complete', { projectId, sessionIds });

  return { killedSessionIds: sessionIds, message };
};
