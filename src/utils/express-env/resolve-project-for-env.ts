import path from 'path';

import { mergeProjectConfig, readLocalConfig, readRegistry } from '../projects';
import type { ProjectRegistryEntry, MergedProjectConfig } from '../../services/projects/types';

export type ResolvedProjectContext = {
  entry: ProjectRegistryEntry;
  merged: MergedProjectConfig | null;
  luckeeParent?: string;
};

/**
 * Resolve registry entry and merged local config for env operations.
 */
export const resolveProjectContext = (
  projectId: string,
  hubRoot: string,
): ResolvedProjectContext | null => {
  const registry = readRegistry(hubRoot);
  const localConfig = readLocalConfig(hubRoot);
  const entry = registry.find((item) => item.id === projectId);
  if (!entry) {
    return null;
  }
  const luckeeParent = localConfig.luckeeParent ?? localConfig.workspaceParent;
  const merged = luckeeParent ? mergeProjectConfig(entry, localConfig) : null;
  return { entry, merged, luckeeParent };
};

export const getHubRoot = (): string => path.resolve(__dirname, '../../..');
