import {
  getHubRoot,
  removePostgresConsumer,
  resolveProjectForDatabase,
  runPostgresStopAndClearAllSession,
  shouldStopPostgresAfterClose,
} from '../../utils/local-database';

type StopWhenIdleResult =
  | { success: true; message: string; postgresStopped: boolean }
  | { error: string; status: 400 | 500 };

/**
 * Remove a project consumer and stop Postgres when no consumers remain and the hub started it.
 */
export const processStopHubManagedPostgresWhenIdle = (
  projectId: string,
): StopWhenIdleResult => {
  removePostgresConsumer(projectId);

  if (!shouldStopPostgresAfterClose()) {
    return {
      success: true,
      message: 'Postgres still needed by other projects',
      postgresStopped: false,
    };
  }

  const resolved = resolveProjectForDatabase(projectId, getHubRoot());
  if (!resolved) {
    return { error: 'Project not configured for local database', status: 400 };
  }

  if (!resolved.localDatabase.postgres?.stopCommand) {
    return { error: 'Postgres stop command is not configured', status: 400 };
  }

  try {
    const message = runPostgresStopAndClearAllSession(resolved.localDatabase);
    console.log('✅ [local-database.processStopHubManagedPostgresWhenIdle] Postgres stopped', {
      projectId,
    });
    return { success: true, message, postgresStopped: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Postgres stop failed';
    console.error('❌ [local-database.processStopHubManagedPostgresWhenIdle] Stop failed', {
      projectId,
      errorMessage,
    });
    return { error: errorMessage, status: 500 };
  }
};
