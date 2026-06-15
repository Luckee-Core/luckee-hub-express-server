import type { LocalDatabaseConfig } from '../../services/local-database/types';

export type PostgresConnection = {
  host: string;
  port: number;
};

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 5432;

/**
 * Resolve Postgres host/port from registry config with defaults.
 */
export const getPostgresConnection = (localDatabase: LocalDatabaseConfig): PostgresConnection => ({
  host: localDatabase.postgres?.host ?? DEFAULT_HOST,
  port: localDatabase.postgres?.port ?? DEFAULT_PORT,
});
