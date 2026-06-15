import {
  getHubRoot,
  resolveProjectForDatabase,
  runPostgresStopStep,
  wasPostgresStartedByHub,
} from '../../utils/local-database';
import type { LocalDatabaseCleanupResult } from './types';

/**
 * Stop hub-managed Postgres when the hub tab closes or cleanup is requested.
 */
export const processCleanupLocalDatabase = (
  projectId: string,
): LocalDatabaseCleanupResult | { error: string; status: 400 | 500 } => {
  console.log('🚀 [local-database.processCleanupLocalDatabase] Starting cleanup', { projectId });

  if (!wasPostgresStartedByHub(projectId)) {
    console.log('✅ [local-database.processCleanupLocalDatabase] No hub-managed Postgres to stop', {
      projectId,
    });
    return { success: true, message: 'No hub-managed Postgres to stop' };
  }

  const resolved = resolveProjectForDatabase(projectId, getHubRoot());
  if (!resolved) {
    return { error: 'Project not configured for local database', status: 400 };
  }

  if (!resolved.localDatabase.postgres?.stopCommand) {
    return { error: 'Postgres stop command is not configured', status: 400 };
  }

  try {
    const message = runPostgresStopStep(projectId, resolved.localDatabase);
    console.log('✅ [local-database.processCleanupLocalDatabase] Cleanup complete', { projectId });
    return { success: true, message };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Cleanup failed';
    console.error('❌ [local-database.processCleanupLocalDatabase] Cleanup failed', {
      projectId,
      errorMessage,
    });
    return { error: errorMessage, status: 500 };
  }
};
