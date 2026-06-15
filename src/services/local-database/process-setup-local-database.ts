import {
  buildLocalDatabaseProbeContext,
  getHubRoot,
  resolveProjectForDatabase,
} from '../../utils/local-database';
import { processRunAllLocalDatabaseSteps } from './process-run-local-database-step';
import type { LocalDatabaseSetupResult } from './types';

/**
 * Create database, apply migrations, and configure .env for a project.
 */
export const processSetupLocalDatabase = (
  projectId: string,
): LocalDatabaseSetupResult | { error: string; status: 400 | 500 } => {
  console.log('🚀 [local-database.processSetupLocalDatabase] Starting setup', { projectId });

  const results = processRunAllLocalDatabaseSteps(projectId);
  if ('error' in results) {
    return results;
  }

  const resolved = resolveProjectForDatabase(projectId, getHubRoot());
  if (!resolved) {
    return { error: 'Project not configured for local database', status: 400 };
  }

  const context = buildLocalDatabaseProbeContext(resolved);
  const migrationsApplied = results
    .filter((result) => result.stepId.startsWith('migration-'))
    .map((result) => result.stepId.slice('migration-'.length));

  console.log('✅ [local-database.processSetupLocalDatabase] Setup complete', { projectId });
  return {
    success: true,
    databaseName: context.localDatabase.databaseName,
    databaseUrl: context.databaseUrl,
    migrationsApplied,
    message: `Database ${context.localDatabase.databaseName} is ready`,
  };
};
