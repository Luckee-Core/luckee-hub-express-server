import path from 'path';

import { getExpressRegistryRepo } from '../projects';
import type { LocalDatabaseConfig } from '../../services/local-database/types';
import type { MergedProjectConfig, ProjectRegistryEntry } from '../../services/projects/types';
import { buildDatabaseUrl, databaseExists, isPostgresRunning, schemaReady } from './postgres-probes';
import { envConfigured } from './env-database-url';
import { getPostgresConnection } from './get-postgres-connection';

export type LocalDatabaseProbeContext = {
  entry: ProjectRegistryEntry;
  merged: MergedProjectConfig;
  localDatabase: LocalDatabaseConfig;
  expressEnvPath: string;
  databaseUrl: string;
  postgresRunning: boolean;
  databaseExists: boolean;
  schemaReady: boolean;
  envConfigured: boolean;
};

type BuildLocalDatabaseProbeContextInput = {
  entry: ProjectRegistryEntry;
  merged: MergedProjectConfig;
  localDatabase: LocalDatabaseConfig;
};

/**
 * Build probe flags and paths used by setup step builders and runners.
 */
export const buildLocalDatabaseProbeContext = ({
  entry,
  merged,
  localDatabase,
}: BuildLocalDatabaseProbeContextInput): LocalDatabaseProbeContext => {
  const connection = getPostgresConnection(localDatabase);
  const expressRepo = getExpressRegistryRepo(entry);
  const expressEnvPath = expressRepo?.repoName
    ? `${expressRepo.repoName}/.env`
    : path.basename(merged.expressDir!) + '/.env';
  const expectedTables = localDatabase.expectedTables ?? [];
  const databaseUrl = buildDatabaseUrl(localDatabase.databaseName, connection);
  const postgresRunning = isPostgresRunning(connection);
  const dbExists = postgresRunning && databaseExists(localDatabase.databaseName, connection);
  const tablesReady =
    dbExists && expectedTables.length > 0
      ? schemaReady(localDatabase.databaseName, expectedTables, connection)
      : false;
  const envOk = envConfigured(merged.expressDir!, localDatabase.databaseName);

  return {
    entry,
    merged,
    localDatabase,
    expressEnvPath,
    databaseUrl,
    postgresRunning,
    databaseExists: dbExists,
    schemaReady: tablesReady,
    envConfigured: envOk,
  };
};
