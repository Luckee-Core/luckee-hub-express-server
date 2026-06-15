import {
  buildLocalDatabaseProbeContext,
  buildLocalDatabaseSetupSteps,
  getHubRoot,
  getPostgresConnection,
  resolveProjectForDatabase,
  wasPostgresStartedByHub,
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

  const context = buildLocalDatabaseProbeContext(resolved);
  const connection = getPostgresConnection(context.localDatabase);

  const setupSteps = buildLocalDatabaseSetupSteps({
    localDatabase: context.localDatabase,
    expressEnvPath: context.expressEnvPath,
    databaseUrl: context.databaseUrl,
    postgresRunning: context.postgresRunning,
    databaseExists: context.databaseExists,
    schemaReady: context.schemaReady,
    envConfigured: context.envConfigured,
  });

  const hasRunnablePostgresSteps = setupSteps.some(
    (step) =>
      (step.id === 'postgres-install' || step.id === 'postgres-start') && step.runnable,
  );

  const probe: LocalDatabaseProbe = {
    supported: true,
    kind: context.localDatabase.kind,
    databaseName: context.localDatabase.databaseName,
    migrationsDir: context.localDatabase.migrationsDir,
    migrationFiles: context.localDatabase.migrationFiles,
    expressEnvPath: context.expressEnvPath,
    setupSteps,
    postgresRunning: context.postgresRunning,
    postgresStartedByHub: wasPostgresStartedByHub(projectId),
    databaseExists: context.databaseExists,
    schemaReady: context.schemaReady,
    envConfigured: context.envConfigured,
    databaseUrl: context.databaseUrl,
    message:
      !context.postgresRunning && !hasRunnablePostgresSteps
        ? `Postgres is not running on ${connection.host}:${connection.port}.`
        : undefined,
  };

  console.log('✅ [local-database.processProbeLocalDatabase] Probe complete', {
    projectId,
    schemaReady: probe.schemaReady,
  });
  return probe;
};
