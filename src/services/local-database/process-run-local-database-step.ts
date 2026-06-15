import {
  buildLocalDatabaseProbeContext,
  buildLocalDatabaseSetupSteps,
  findLocalDatabaseSetupStep,
  getHubRoot,
  getPostgresFormula,
  markPostgresStartedByHub,
  resolveProjectForDatabase,
  runCreatedbStep,
  runEnvStep,
  runMigrationStep,
  runPostgresInstallStep,
  runPostgresStartStep,
  runPostgresStopStep,
} from '../../utils/local-database';
import type { LocalDatabaseStepResult } from './types';

/**
 * Execute a single local database setup step by id.
 */
export const processRunLocalDatabaseStep = (
  projectId: string,
  stepId: string,
): LocalDatabaseStepResult | { error: string; status: 400 | 500 } => {
  console.log('🚀 [local-database.processRunLocalDatabaseStep] Starting step', {
    projectId,
    stepId,
  });

  if (stepId === 'refresh') {
    return {
      success: true,
      stepId,
      message: 'Refresh setup status from the hub',
    };
  }

  const resolved = resolveProjectForDatabase(projectId, getHubRoot());
  if (!resolved) {
    return { error: 'Project not configured for local database', status: 400 };
  }

  const context = buildLocalDatabaseProbeContext(resolved);
  const stepInput = {
    localDatabase: context.localDatabase,
    expressEnvPath: context.expressEnvPath,
    databaseUrl: context.databaseUrl,
    postgresRunning: context.postgresRunning,
    databaseExists: context.databaseExists,
    schemaReady: context.schemaReady,
    envConfigured: context.envConfigured,
  };

  const { localDatabase, merged, databaseUrl } = context;
  const expressDir = merged.expressDir!;

  if (stepId === 'postgres-stop') {
    if (!context.postgresRunning) {
      return { error: 'Postgres is not running', status: 400 };
    }
    if (!localDatabase.postgres?.stopCommand) {
      return { error: 'Postgres stop command is not configured', status: 400 };
    }

    try {
      console.log('💾 [local-database.processRunLocalDatabaseStep] Stopping Postgres');
      const message = runPostgresStopStep(projectId, localDatabase);
      console.log('✅ [local-database.processRunLocalDatabaseStep] Step complete', {
        projectId,
        stepId,
      });
      return { success: true, stepId, message };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Step failed';
      console.error('❌ [local-database.processRunLocalDatabaseStep] Step failed', {
        projectId,
        stepId,
        errorMessage,
      });
      return { error: errorMessage, status: 500 };
    }
  }

  const step = findLocalDatabaseSetupStep(stepInput, stepId);
  if (!step) {
    return { error: `Unknown setup step: ${stepId}`, status: 400 };
  }
  if (!step.runnable) {
    return { error: `Step "${stepId}" is not runnable right now`, status: 400 };
  }

  try {
    let message: string;

    if (stepId === 'postgres-install') {
      console.log('💾 [local-database.processRunLocalDatabaseStep] Installing Postgres');
      message = runPostgresInstallStep(localDatabase);
    } else if (stepId === 'postgres-start') {
      console.log('💾 [local-database.processRunLocalDatabaseStep] Starting Postgres');
      message = runPostgresStartStep(localDatabase);
      const formula = getPostgresFormula(localDatabase.postgres);
      if (formula) {
        markPostgresStartedByHub(projectId, formula);
      }
    } else if (stepId === 'createdb') {
      message = runCreatedbStep(localDatabase.databaseName);
    } else if (stepId.startsWith('migration-')) {
      const file = stepId.slice('migration-'.length);
      message = runMigrationStep(expressDir, databaseUrl, localDatabase.migrationsDir, file);
    } else if (stepId === 'env') {
      message = runEnvStep(expressDir, databaseUrl);
    } else {
      return { error: `Unknown setup step: ${stepId}`, status: 400 };
    }

    console.log('✅ [local-database.processRunLocalDatabaseStep] Step complete', {
      projectId,
      stepId,
    });
    return { success: true, stepId, message };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Step failed';
    console.error('❌ [local-database.processRunLocalDatabaseStep] Step failed', {
      projectId,
      stepId,
      errorMessage,
    });
    return { error: errorMessage, status: 500 };
  }
};

/**
 * Run all currently runnable setup steps in registry order.
 */
export const processRunAllLocalDatabaseSteps = (
  projectId: string,
): LocalDatabaseStepResult[] | { error: string; status: 400 | 500 } => {
  console.log('🚀 [local-database.processRunAllLocalDatabaseSteps] Starting setup', { projectId });

  const resolved = resolveProjectForDatabase(projectId, getHubRoot());
  if (!resolved) {
    return { error: 'Project not configured for local database', status: 400 };
  }

  const results: LocalDatabaseStepResult[] = [];
  const maxIterations = 20;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const context = buildLocalDatabaseProbeContext(resolved);
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
      break;
    }

    const result = processRunLocalDatabaseStep(projectId, nextStep.id);
    if ('error' in result) {
      return result;
    }
    results.push(result);
  }

  if (results.length === 0) {
    return { error: 'No setup steps are runnable', status: 400 };
  }

  console.log('✅ [local-database.processRunAllLocalDatabaseSteps] Setup complete', {
    projectId,
    stepCount: results.length,
  });
  return results;
};
