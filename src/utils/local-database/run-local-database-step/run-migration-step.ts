import fs from 'fs';
import path from 'path';

import { runShellCommand } from '../run-shell-command';

/**
 * Apply a single migration file with psql.
 */
export const runMigrationStep = (
  expressDir: string,
  databaseUrl: string,
  migrationsDir: string,
  file: string,
): string => {
  const migrationPath = path.join(expressDir, migrationsDir, file);
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${migrationPath}`);
  }
  runShellCommand(`psql "${databaseUrl}" -f "${migrationPath}"`, { cwd: expressDir });
  return `Applied migration ${file}`;
};
