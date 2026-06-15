import { runShellCommand } from '../run-shell-command';
import { validateDatabaseName } from '../validate-database-name';

/**
 * Create a Postgres database with createdb.
 */
export const runCreatedbStep = (databaseName: string): string => {
  if (!validateDatabaseName(databaseName)) {
    throw new Error('Invalid database name');
  }
  runShellCommand(`createdb "${databaseName}"`);
  return `Database "${databaseName}" created`;
};
