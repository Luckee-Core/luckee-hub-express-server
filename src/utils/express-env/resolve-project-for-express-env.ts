import path from 'path';

import { mergeProjectConfig, readLocalConfig, readRegistry } from '../projects';
import type { ExpressEnvConfig } from '../../services/express-env/types';
import type { MergedProjectConfig, ProjectRegistryEntry } from '../../services/projects/types';

export type ResolvedProjectForExpressEnv = {
  entry: ProjectRegistryEntry;
  merged: MergedProjectConfig;
  expressEnv: ExpressEnvConfig;
};

/**
 * Resolve project for express .env group operations.
 */
export const resolveProjectForExpressEnv = (
  projectId: string,
  hubRoot: string,
): ResolvedProjectForExpressEnv | null => {
  const registry = readRegistry(hubRoot);
  const localConfig = readLocalConfig(hubRoot);
  const entry = registry.find((item) => item.id === projectId);
  if (!entry?.expressEnv?.groups) {
    return null;
  }
  const merged = mergeProjectConfig(entry, localConfig);
  if (!merged?.expressDir) {
    return null;
  }
  return { entry, merged, expressEnv: entry.expressEnv };
};

/**
 * Default hub-express root for express-env operations.
 */
export const getHubRoot = (): string => path.resolve(__dirname, '../../..');
