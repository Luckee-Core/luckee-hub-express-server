export type LocalDatabaseConfig = {
  kind: 'postgres';
  databaseName: string;
  migrationsDir: string;
  migrationFiles: string[];
  expectedTables?: string[];
};

export type LocalDatabaseProbe = {
  supported: boolean;
  kind?: 'postgres';
  databaseName?: string;
  postgresRunning: boolean;
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
