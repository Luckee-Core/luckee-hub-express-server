import os from 'os';

import { runShellCommandQuiet } from './run-shell-command';
import { validateDatabaseName } from './validate-database-name';

const PG_HOST = '127.0.0.1';
const PG_PORT = 5432;

/**
 * Build a local Postgres connection URL for the current user.
 */
export const buildDatabaseUrl = (databaseName: string): string => {
  const user = os.userInfo().username;
  return `postgresql://${user}@${PG_HOST}:${PG_PORT}/${databaseName}`;
};

/**
 * Check whether Postgres is accepting connections on localhost.
 */
export const isPostgresRunning = (): boolean => {
  const result = runShellCommandQuiet(`pg_isready -h ${PG_HOST} -p ${PG_PORT} -q`);
  return result !== null;
};

/**
 * Check whether a logical database exists in the cluster.
 */
export const databaseExists = (databaseName: string): boolean => {
  if (!validateDatabaseName(databaseName)) {
    return false;
  }
  const user = os.userInfo().username;
  const out = runShellCommandQuiet(
    `psql -h ${PG_HOST} -p ${PG_PORT} -U ${user} -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${databaseName}'"`,
  );
  return out === '1';
};

/**
 * Check whether all expected public tables exist.
 */
export const schemaReady = (databaseName: string, expectedTables: string[]): boolean => {
  if (expectedTables.length === 0 || !validateDatabaseName(databaseName)) {
    return false;
  }
  const databaseUrl = buildDatabaseUrl(databaseName);
  for (const table of expectedTables) {
    const out = runShellCommandQuiet(
      `psql "${databaseUrl}" -tAc "SELECT to_regclass('public.${table}') IS NOT NULL"`,
    );
    if (out !== 't') {
      return false;
    }
  }
  return true;
};
