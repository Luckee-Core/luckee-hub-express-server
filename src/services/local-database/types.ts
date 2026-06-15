export type LocalDatabasePostgresConfig = {
  host?: string;
  port?: number;
  formula?: string;
  installCommand?: string;
  startCommand?: string;
  stopCommand?: string;
};

export type LocalDatabaseConfig = {
  kind: 'postgres';
  databaseName: string;
  migrationsDir: string;
  migrationFiles: string[];
  expectedTables?: string[];
  postgres?: LocalDatabasePostgresConfig;
};

export type LocalDatabaseSetupStepStatus = 'done' | 'pending' | 'skipped' | 'blocked';

export type LocalDatabaseSetupStep = {
  id: string;
  title: string;
  detail?: string;
  status: LocalDatabaseSetupStepStatus;
  runnable: boolean;
  actionLabel?: string;
  skipped?: boolean;
  stoppable?: boolean;
  stopStepId?: string;
  stopActionLabel?: string;
};

export type LocalDatabaseStepResult = {
  success: boolean;
  stepId: string;
  message: string;
};

export type LocalDatabaseCleanupResult = {
  success: boolean;
  message: string;
};

export type LocalDatabaseProbe = {
  supported: boolean;
  kind?: 'postgres';
  databaseName?: string;
  migrationsDir?: string;
  migrationFiles?: string[];
  expressEnvPath?: string;
  setupSteps?: LocalDatabaseSetupStep[];
  postgresRunning: boolean;
  postgresStartedByHub?: boolean;
  databaseExists: boolean;
  schemaReady: boolean;
  envConfigured: boolean;
  databaseUrl?: string;
  message?: string;
};

export type LocalDatabaseSetupResult = {
  success: boolean;
  databaseName: string;
  databaseUrl: string;
  migrationsApplied: string[];
  message: string;
};
