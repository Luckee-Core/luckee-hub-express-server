import type { LocalDatabaseConfig } from '../../services/local-database/types';
import type { MergedProjectConfig } from '../../services/projects/types';

/**
 * Resolve which checkout owns migrations and DATABASE_URL for local database setup.
 */
export const resolveDatabaseRepoDir = (
  merged: MergedProjectConfig,
  localDatabase: LocalDatabaseConfig,
): string | undefined => {
  const envRepo = localDatabase.envRepo ?? 'express';
  if (envRepo === 'storage-express') {
    return merged.storageExpressDir;
  }
  return merged.expressDir;
};
