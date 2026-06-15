import { upsertDatabaseUrlInEnv } from '../env-database-url';

/**
 * Upsert DATABASE_URL in the express .env file.
 */
export const runEnvStep = (expressDir: string, databaseUrl: string): string => {
  upsertDatabaseUrlInEnv(expressDir, databaseUrl);
  return 'DATABASE_URL written to express .env';
};
