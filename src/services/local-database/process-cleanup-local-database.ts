import { processStopHubManagedPostgresWhenIdle } from './process-stop-hub-managed-postgres-when-idle';
import type { LocalDatabaseCleanupResult } from './types';

/**
 * Stop hub-managed Postgres when the hub tab closes or cleanup is requested.
 */
export const processCleanupLocalDatabase = (
  projectId: string,
): LocalDatabaseCleanupResult | { error: string; status: 400 | 500 } => {
  console.log('🚀 [local-database.processCleanupLocalDatabase] Starting cleanup', { projectId });

  const result = processStopHubManagedPostgresWhenIdle(projectId);
  if ('error' in result) {
    return result;
  }

  if (!result.postgresStopped) {
    console.log('✅ [local-database.processCleanupLocalDatabase] No hub-managed Postgres to stop', {
      projectId,
    });
    return { success: true, message: result.message };
  }

  console.log('✅ [local-database.processCleanupLocalDatabase] Cleanup complete', { projectId });
  return { success: true, message: result.message };
};
