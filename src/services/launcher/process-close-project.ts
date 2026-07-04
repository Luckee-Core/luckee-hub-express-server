import { processStopHubManagedPostgresWhenIdle } from '../local-database/process-stop-hub-managed-postgres-when-idle';
import {
  isPostgresConsumer,
  resolveProjectForDatabase,
} from '../../utils/local-database';
import { getHubRoot } from '../../utils/local-database/resolve-project-for-database';
import { killProjectSessions, listSessions } from '../terminals/session-registry';

export type CloseProjectResult = {
  killedSessionIds: string[];
  postgresStopped: boolean;
  message: string;
};

/**
 * Kill project dev server terminals and stop hub-managed Postgres when idle.
 */
export const processCloseProject = (
  projectId: string,
): CloseProjectResult | { error: string; status: 400 | 500 } => {
  console.log('🚀 [launcher.processCloseProject] Closing project', { projectId });

  const sessionIds = listSessions()
    .filter((session) => session.projectId === projectId)
    .map((session) => session.sessionId);
  const wasConsumer = isPostgresConsumer(projectId);

  if (sessionIds.length === 0 && !wasConsumer) {
    return { error: 'No active terminals or database session for this project', status: 400 };
  }

  killProjectSessions(projectId);

  let postgresStopped = false;
  let message =
    sessionIds.length > 0
      ? `Closed ${sessionIds.length} terminal session(s)`
      : 'No terminal sessions to close';

  if (resolveProjectForDatabase(projectId, getHubRoot())) {
    const pgResult = processStopHubManagedPostgresWhenIdle(projectId);
    if ('error' in pgResult) {
      return pgResult;
    }
    if (pgResult.postgresStopped) {
      postgresStopped = true;
      message = `${message}; ${pgResult.message}`;
    }
  }

  console.log('✅ [launcher.processCloseProject] Project closed', {
    projectId,
    sessionCount: sessionIds.length,
    postgresStopped,
  });

  return {
    killedSessionIds: sessionIds,
    postgresStopped,
    message,
  };
};
