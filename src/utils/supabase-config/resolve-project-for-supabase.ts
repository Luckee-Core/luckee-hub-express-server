import path from 'path';

import { mergeProjectConfig, readLocalConfig, readRegistry } from '../projects';
import type { SupabaseConfig } from '../../services/supabase-config/types';
import type { MergedProjectConfig, ProjectRegistryEntry } from '../../services/projects/types';

export type ResolvedProjectForSupabase = {
  entry: ProjectRegistryEntry;
  merged: MergedProjectConfig;
  supabase: SupabaseConfig;
};

/**
 * Resolve project registry entry and merged config for Supabase env operations.
 */
export const resolveProjectForSupabase = (
  projectId: string,
  hubRoot: string,
): ResolvedProjectForSupabase | null => {
  const registry = readRegistry(hubRoot);
  const localConfig = readLocalConfig(hubRoot);
  const entry = registry.find((item) => item.id === projectId);
  if (!entry?.supabase) {
    return null;
  }
  const merged = mergeProjectConfig(entry, localConfig);
  if (!merged?.expressDir) {
    return null;
  }
  return { entry, merged, supabase: entry.supabase };
};

/**
 * Default hub-express root for Supabase config operations.
 */
export const getHubRoot = (): string => path.resolve(__dirname, '../../..');
