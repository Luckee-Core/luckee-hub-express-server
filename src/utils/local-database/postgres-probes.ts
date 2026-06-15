import os from 'os';
import { execSync } from 'child_process';

import type { PostgresConnection } from './get-postgres-connection';
import { runShellCommandQuiet } from './run-shell-command';
import { validateDatabaseName } from './validate-database-name';

/**
 * Build a local Postgres connection URL for the current user.
 */
export const buildDatabaseUrl = (
  databaseName: string,
  connection: PostgresConnection,
): string => {
  const user = os.userInfo().username;
  return `postgresql://${user}@${connection.host}:${connection.port}/${databaseName}`;
};

/**
 * Check whether Postgres is accepting connections.
 */
export const isPostgresRunning = (connection: PostgresConnection): boolean => {
  const result = runShellCommandQuiet(
    `pg_isready -h ${connection.host} -p ${connection.port} -q`,
  );
  return result !== null;
};

/**
 * Check whether a logical database exists in the cluster.
 */
export const databaseExists = (
  databaseName: string,
  connection: PostgresConnection,
): boolean => {
  if (!validateDatabaseName(databaseName)) {
    return false;
  }
  const user = os.userInfo().username;
  const out = runShellCommandQuiet(
    `psql -h ${connection.host} -p ${connection.port} -U ${user} -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${databaseName}'"`,
  );
  return out === '1';
};

/**
 * Check whether all expected public tables exist.
 */
export const schemaReady = (
  databaseName: string,
  expectedTables: string[],
  connection: PostgresConnection,
): boolean => {
  if (expectedTables.length === 0 || !validateDatabaseName(databaseName)) {
    return false;
  }
  return tablesExist(databaseName, expectedTables, connection);
};

/**
 * Check whether specific public tables exist.
 */
export const tablesExist = (
  databaseName: string,
  tables: string[],
  connection: PostgresConnection,
): boolean => {
  if (tables.length === 0 || !validateDatabaseName(databaseName)) {
    return false;
  }
  const databaseUrl = buildDatabaseUrl(databaseName, connection);
  for (const table of tables) {
    const out = runShellCommandQuiet(
      `psql "${databaseUrl}" -tAc "SELECT to_regclass('public.${table}') IS NOT NULL"`,
    );
    if (out !== 't') {
      return false;
    }
  }
  return true;
};

/**
 * Poll pg_isready until Postgres accepts connections or timeout elapses.
 */
export const waitForPostgres = (
  connection: PostgresConnection,
  timeoutMs = 10_000,
  intervalMs = 500,
): boolean => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (isPostgresRunning(connection)) {
      return true;
    }
    execSync(`sleep ${intervalMs / 1000}`);
  }
  return isPostgresRunning(connection);
};
