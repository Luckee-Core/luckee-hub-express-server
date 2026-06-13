import {
  buildDatabaseUrl,
  databaseExists,
  envConfigured,
  getHubRoot,
  isPostgresRunning,
  resolveProjectForDatabase,
  schemaReady,
} from '../../utils/local-database';
import type { LocalDatabaseProbe } from './types';

/**
 * Probe local Postgres status for a project.
 */
export const processProbeLocalDatabase = (projectId: string): LocalDatabaseProbe => {
  console.log('🚀 [local-database.processProbeLocalDatabase] Starting probe', { projectId });
  const resolved = resolveProjectForDatabase(projectId, getHubRoot());

  if (!resolved) {
    return {
      supported: false,
      postgresRunning: false,
      databaseExists: false,
      schemaReady: false,
      envConfigured: false,
      message: 'Local database not configured for this project',
    };
  }

  const { localDatabase, merged } = resolved;
  const expectedTables = localDatabase.expectedTables ?? [];
  const databaseUrl = buildDatabaseUrl(localDatabase.databaseName);
  const postgresRunning = isPostgresRunning();
  const dbExists = postgresRunning && databaseExists(localDatabase.databaseName);
  const tablesReady =
    dbExists && expectedTables.length > 0
      ? schemaReady(localDatabase.databaseName, expectedTables)
      : false;
  const envOk = envConfigured(merged.expressDir!, localDatabase.databaseName);

  const probe: LocalDatabaseProbe = {
    supported: true,
    kind: localDatabase.kind,
    databaseName: localDatabase.databaseName,
    postgresRunning,
    databaseExists: dbExists,
    schemaReady: tablesReady,
    envConfigured: envOk,
    databaseUrl,
    message: !postgresRunning
      ? 'Postgres is not running — start with: brew services start postgresql@16'
      : undefined,
  };

  console.log('✅ [local-database.processProbeLocalDatabase] Probe complete', {
    projectId,
    schemaReady: probe.schemaReady,
  });
  return probe;
};
