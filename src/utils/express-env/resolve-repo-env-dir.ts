import path from 'path';

import type { HubProjectRepoRole, MergedProjectConfig, ProjectRegistryEntry } from '../../services/projects/types';
import { resolveProjectClonePaths } from '../projects/resolve-project-clone-paths';

/**
 * Resolve checkout directory for a repo role + name.
 */
export const resolveRepoEnvDir = (
  entry: ProjectRegistryEntry,
  merged: MergedProjectConfig | null,
  luckeeParent: string | undefined,
  role: HubProjectRepoRole,
  repoName: string,
): string | undefined => {
  if (merged?.local?.repoDirs?.[repoName]) {
    return merged.local.repoDirs[repoName];
  }

  if (merged) {
    if (role === 'express') {
      return merged.expressDir;
    }
    if (role === 'storage') {
      return merged.storageExpressDir;
    }
    if (role === 'dispatcher') {
      return merged.dispatcherDir;
    }
    if (role === 'web' || role === 'console' || role === 'dispatcher-web') {
      const repo = entry.repos.find((r) => r.repoName === repoName);
      if (repo?.repoType === 'nextjs') {
        const firstNext = entry.repos.find((r) => r.repoType === 'nextjs');
        if (firstNext?.repoName === repoName) {
          return merged.webDir;
        }
      }
    }
  }

  if (!luckeeParent) {
    return undefined;
  }

  const clonePaths = resolveProjectClonePaths(luckeeParent, entry);
  const repo = entry.repos.find((r) => r.repoName === repoName);
  if (!repo) {
    return undefined;
  }
  if (repo.repoType === 'express' && role === 'dispatcher') {
    return path.join(clonePaths.projectRoot, repoName);
  }
  if (repo.repoType === 'express') {
    return clonePaths.expressDir;
  }
  if (repo.repoType === 'storage-express') {
    return clonePaths.storageExpressDir;
  }
  if (repo.repoType === 'nextjs') {
    return path.join(clonePaths.projectRoot, repoName);
  }
  return undefined;
};
