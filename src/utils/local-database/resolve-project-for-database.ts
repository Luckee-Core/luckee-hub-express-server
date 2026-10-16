import path from 'path';

import { mergeProjectConfig, readLocalConfig, readRegistry } from '../projects';
import type { LocalDatabaseConfig } from '../../services/local-database/types';
import type { MergedProjectConfig, ProjectRegistryEntry } from '../../services/projects/types';
import { resolveDatabaseRepoDir } from './resolve-database-repo-dir';

export type ResolvedProjectForDatabase = {
  entry: ProjectRegistryEntry;
  merged: MergedProjectConfig;
  localDatabase: LocalDatabaseConfig;
};

/**
 * Resolve project registry entry and merged config for local database operations.
 */
export const resolveProjectForDatabase = (
  projectId: string,
  hubRoot: string,
): ResolvedProjectForDatabase | null => {
  const registry = readRegistry(hubRoot);
  const localConfig = readLocalConfig(hubRoot);
  const entry = registry.find((item) => item.id === projectId);
  if (!entry?.localDatabase) {
    return null;
  }
  const merged = mergeProjectConfig(entry, localConfig);
  if (!merged) {
    return null;
  }
  const databaseRepoDir = resolveDatabaseRepoDir(merged, entry.localDatabase);
  if (!databaseRepoDir) {
    return null;
  }
  return { entry, merged, localDatabase: entry.localDatabase };
};

/**
 * Default hub-express root for local database operations.
 */
export const getHubRoot = (): string => path.resolve(__dirname, '../../..');
