import {
  addPostgresConsumer,
  buildLocalDatabaseProbeContext,
  buildLocalDatabaseSetupSteps,
  getHubRoot,
  resolveProjectForDatabase,
} from '../../utils/local-database';
import type { LocalDatabaseProbeContext } from '../../utils/local-database/build-local-database-probe-context';
import { processRunLocalDatabaseStep } from './process-run-local-database-step';

type EnsureLocalDatabaseResult =
  | { success: true; message: string }
  | { error: string; status: 400 | 500 };

const isLocalDatabaseReady = (context: LocalDatabaseProbeContext): boolean =>
  context.postgresRunning &&
  context.databaseExists &&
  context.schemaReady &&
  context.envConfigured;

/**
 * Ensure local Postgres, schema, and .env are ready before spawning dev servers.
 */
export const processEnsureLocalDatabaseForRun = (
  projectId: string,
): EnsureLocalDatabaseResult => {
  const resolved = resolveProjectForDatabase(projectId, getHubRoot());
  if (!resolved) {
    return { success: true, message: 'No local database configured' };
  }

  console.log('🚀 [local-database.processEnsureLocalDatabaseForRun] Ensuring database', {
    projectId,
  });

  const maxIterations = 20;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const context = buildLocalDatabaseProbeContext(resolved);

    if (isLocalDatabaseReady(context)) {
      addPostgresConsumer(projectId);
      console.log('✅ [local-database.processEnsureLocalDatabaseForRun] Database ready', {
        projectId,
        databaseName: context.localDatabase.databaseName,
      });
      return {
        success: true,
        message: `Database ${context.localDatabase.databaseName} is ready`,
      };
    }

    const steps = buildLocalDatabaseSetupSteps({
      localDatabase: context.localDatabase,
      expressEnvPath: context.expressEnvPath,
      databaseUrl: context.databaseUrl,
      postgresRunning: context.postgresRunning,
      databaseExists: context.databaseExists,
      schemaReady: context.schemaReady,
      envConfigured: context.envConfigured,
    });

    const nextStep = steps.find(
      (step) => step.runnable && step.id !== 'refresh' && step.id !== 'postgres',
    );

    if (!nextStep) {
      console.error('❌ [local-database.processEnsureLocalDatabaseForRun] Setup incomplete', {
        projectId,
      });
      return {
        error: 'Local database setup is incomplete — check Local Database steps on the project detail page',
        status: 500,
      };
    }

    const result = processRunLocalDatabaseStep(projectId, nextStep.id);
    if ('error' in result) {
      return result;
    }
  }

  return {
    error: 'Local database setup exceeded step limit',
    status: 500,
  };
};
