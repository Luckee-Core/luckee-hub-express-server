import type {
  LocalDatabaseConfig,
  LocalDatabaseSetupStep,
  LocalDatabaseSetupStepStatus,
} from '../../services/local-database/types';
import { getPostgresConnection } from './get-postgres-connection';
import { isConfiguredPostgresInstalled } from './postgres-brew';
import { tablesExist } from './postgres-probes';

type BuildLocalDatabaseSetupStepsInput = {
  localDatabase: LocalDatabaseConfig;
  expressEnvPath: string;
  databaseUrl: string;
  postgresRunning: boolean;
  databaseExists: boolean;
  schemaReady: boolean;
  envConfigured: boolean;
};

type StepFields = Pick<
  LocalDatabaseSetupStep,
  | 'id'
  | 'title'
  | 'detail'
  | 'status'
  | 'runnable'
  | 'actionLabel'
  | 'skipped'
  | 'stoppable'
  | 'stopStepId'
  | 'stopActionLabel'
>;

const makeStep = (fields: StepFields): LocalDatabaseSetupStep => fields;

const buildPostgresVerifyStep = (
  connection: ReturnType<typeof getPostgresConnection>,
  postgresRunning: boolean,
  postgresConfig: LocalDatabaseConfig['postgres'],
): LocalDatabaseSetupStep => {
  const hasStopCommand = !!postgresConfig?.stopCommand;
  const stoppable = postgresRunning && hasStopCommand;

  return makeStep({
    id: 'postgres',
    title: `Verify Postgres is running on ${connection.host}:${connection.port}`,
    status: postgresRunning ? 'done' : 'blocked',
    runnable: false,
    stoppable,
    stopStepId: stoppable ? 'postgres-stop' : undefined,
    stopActionLabel: stoppable ? 'Stop Postgres' : undefined,
  });
};

const getMigrationTablesForIndex = (
  expectedTables: string[],
  migrationCount: number,
  index: number,
): string[] => {
  if (expectedTables.length === 0 || migrationCount === 0) {
    return [];
  }
  const tablesPerMigration = Math.ceil(expectedTables.length / migrationCount);
  const start = index * tablesPerMigration;
  return expectedTables.slice(start, start + tablesPerMigration);
};

const isMigrationApplied = (
  localDatabase: LocalDatabaseConfig,
  index: number,
  connection: ReturnType<typeof getPostgresConnection>,
): boolean => {
  const expectedTables = localDatabase.expectedTables ?? [];
  const migrationTables = getMigrationTablesForIndex(
    expectedTables,
    localDatabase.migrationFiles.length,
    index,
  );
  if (migrationTables.length === 0) {
    return false;
  }
  return tablesExist(localDatabase.databaseName, migrationTables, connection);
};

/**
 * Steps shown on the hub detail page — mirrors runnable setup actions.
 */
export const buildLocalDatabaseSetupSteps = ({
  localDatabase,
  expressEnvPath,
  databaseUrl,
  postgresRunning,
  databaseExists: dbExists,
  schemaReady: tablesReady,
  envConfigured: envOk,
}: BuildLocalDatabaseSetupStepsInput): LocalDatabaseSetupStep[] => {
  const { databaseName, migrationsDir, migrationFiles } = localDatabase;
  const connection = getPostgresConnection(localDatabase);
  const postgresConfig = localDatabase.postgres;
  const steps: LocalDatabaseSetupStep[] = [];

  const hasInstallCommand = !!postgresConfig?.installCommand;
  const hasStartCommand = !!postgresConfig?.startCommand;
  const postgresInstalled = isConfiguredPostgresInstalled(postgresConfig);

  if (hasInstallCommand) {
    const skipped = postgresInstalled && !postgresRunning;
    const done = postgresRunning || postgresInstalled;
    let status: LocalDatabaseSetupStepStatus = 'pending';
    if (postgresRunning) {
      status = 'done';
    } else if (skipped) {
      status = 'skipped';
    }
    steps.push(
      makeStep({
        id: 'postgres-install',
        title: 'Install Postgres',
        detail: skipped
          ? 'Postgres is already installed via Homebrew.'
          : 'Installs the local Postgres service via Homebrew.',
        status,
        runnable: !done,
        actionLabel: 'Install Postgres',
        skipped,
      }),
    );
  }

  if (hasStartCommand) {
    const installDone = !hasInstallCommand || postgresInstalled || postgresRunning;
    const done = postgresRunning;
    let status: LocalDatabaseSetupStepStatus = 'done';
    if (!done) {
      status = installDone ? 'pending' : 'blocked';
    }
    steps.push(
      makeStep({
        id: 'postgres-start',
        title: 'Start Postgres',
        detail: `Start Postgres on ${connection.host}:${connection.port}.`,
        status,
        runnable: installDone && !done,
        actionLabel: 'Start Postgres',
      }),
    );
  }

  if (!hasInstallCommand && !hasStartCommand) {
    steps.push(buildPostgresVerifyStep(connection, postgresRunning, postgresConfig));
  } else if (postgresRunning) {
    steps.push(buildPostgresVerifyStep(connection, postgresRunning, postgresConfig));
  }

  const createdbSkipped = dbExists;
  const createdbStatus: LocalDatabaseSetupStepStatus = createdbSkipped
    ? 'skipped'
    : postgresRunning
      ? 'pending'
      : 'blocked';
  steps.push(
    makeStep({
      id: 'createdb',
      title: `Create database "${databaseName}"`,
      detail: 'Runs createdb against your local Postgres instance.',
      status: createdbSkipped ? 'skipped' : createdbStatus,
      runnable: postgresRunning && !dbExists,
      actionLabel: 'Create database',
      skipped: createdbSkipped,
    }),
  );

  let firstPendingMigrationIndex = -1;
  migrationFiles.forEach((file, index) => {
    const applied =
      tablesReady ||
      (dbExists && isMigrationApplied(localDatabase, index, connection));
    if (!applied && firstPendingMigrationIndex === -1) {
      firstPendingMigrationIndex = index;
    }
  });

  migrationFiles.forEach((file, index) => {
    const applied =
      tablesReady ||
      (dbExists && isMigrationApplied(localDatabase, index, connection));
    let status: LocalDatabaseSetupStepStatus = 'done';
    if (!applied) {
      if (!postgresRunning || !dbExists) {
        status = 'blocked';
      } else if (index === firstPendingMigrationIndex) {
        status = 'pending';
      } else {
        status = 'blocked';
      }
    }
    steps.push(
      makeStep({
        id: `migration-${file}`,
        title: `Apply migration ${file}`,
        detail: `psql -f ${migrationsDir}/${file}`,
        status,
        runnable: status === 'pending',
        actionLabel: 'Apply migration',
      }),
    );
  });

  const envStatus: LocalDatabaseSetupStepStatus = envOk
    ? 'done'
    : tablesReady
      ? 'pending'
      : 'blocked';
  steps.push(
    makeStep({
      id: 'env',
      title: `Write DATABASE_URL to ${expressEnvPath}`,
      detail: databaseUrl,
      status: envStatus,
      runnable: tablesReady && !envOk,
      actionLabel: 'Write .env',
    }),
  );

  steps.push(
    makeStep({
      id: 'refresh',
      title: 'Refresh setup status',
      detail: 'Re-check Postgres, schema tables, and .env configuration.',
      status: 'pending',
      runnable: true,
      actionLabel: 'Refresh status',
    }),
  );

  return steps;
};

/**
 * Find a setup step by id from the current probe context.
 */
export const findLocalDatabaseSetupStep = (
  input: BuildLocalDatabaseSetupStepsInput,
  stepId: string,
): LocalDatabaseSetupStep | undefined =>
  buildLocalDatabaseSetupSteps(input).find((step) => step.id === stepId);
