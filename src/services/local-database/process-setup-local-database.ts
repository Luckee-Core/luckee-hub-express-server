import fs from 'fs';
import path from 'path';

import {
  buildDatabaseUrl,
  databaseExists,
  getHubRoot,
  isPostgresRunning,
  resolveProjectForDatabase,
  runShellCommand,
  upsertDatabaseUrlInEnv,
  validateDatabaseName,
} from '../../utils/local-database';
import type { LocalDatabaseSetupResult } from './types';

/**
 * Create database, apply migrations, and configure .env for a project.
 */
export const processSetupLocalDatabase = (
  projectId: string,
): LocalDatabaseSetupResult | { error: string; status: 400 | 500 } => {
  console.log('🚀 [local-database.processSetupLocalDatabase] Starting setup', { projectId });
  const resolved = resolveProjectForDatabase(projectId, getHubRoot());

  if (!resolved) {
    return { error: 'Project not configured for local database', status: 400 };
  }

  const { localDatabase, merged } = resolved;
  const expressDir = merged.expressDir!;

  if (!validateDatabaseName(localDatabase.databaseName)) {
    return { error: 'Invalid database name in registry', status: 400 };
  }

  if (!isPostgresRunning()) {
    return {
      error: 'Postgres is not running on 127.0.0.1:5432. Install and start postgresql@16 first.',
      status: 400,
    };
  }

  const databaseUrl = buildDatabaseUrl(localDatabase.databaseName);

  if (!databaseExists(localDatabase.databaseName)) {
    try {
      console.log('💾 [local-database.processSetupLocalDatabase] Creating database', {
        databaseName: localDatabase.databaseName,
      });
      runShellCommand(`createdb "${localDatabase.databaseName}"`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'createdb failed';
      console.error('❌ [local-database.processSetupLocalDatabase] createdb failed', { message });
      return { error: message, status: 500 };
    }
  }

  const migrationsApplied: string[] = [];
  for (const file of localDatabase.migrationFiles) {
    const migrationPath = path.join(expressDir, localDatabase.migrationsDir, file);
    if (!fs.existsSync(migrationPath)) {
      return { error: `Migration file not found: ${migrationPath}`, status: 400 };
    }
    try {
      console.log('💾 [local-database.processSetupLocalDatabase] Applying migration', { file });
      runShellCommand(`psql "${databaseUrl}" -f "${migrationPath}"`, { cwd: expressDir });
      migrationsApplied.push(file);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Failed to apply ${file}`;
      console.error('❌ [local-database.processSetupLocalDatabase] Migration failed', { file, message });
      return { error: message, status: 500 };
    }
  }

  console.log('💾 [local-database.processSetupLocalDatabase] Upserting DATABASE_URL');
  upsertDatabaseUrlInEnv(expressDir, databaseUrl);

  console.log('✅ [local-database.processSetupLocalDatabase] Setup complete', { projectId });
  return {
    success: true,
    databaseName: localDatabase.databaseName,
    databaseUrl,
    migrationsApplied,
    message: `Database ${localDatabase.databaseName} is ready`,
  };
};
