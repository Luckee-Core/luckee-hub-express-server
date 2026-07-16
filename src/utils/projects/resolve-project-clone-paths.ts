import path from 'path';

import type { ProjectRegistryEntry } from '../../services/projects/types';
import { getExpressRegistryRepo, getNextjsRegistryRepo } from './get-registry-repo';

const LUCKEE_DIR = 'luckee';

export type ProjectClonePaths = {
  luckeeRoot: string;
  projectRoot: string;
  webDir?: string;
  expressDir?: string;
};

/**
 * Build clone/install paths under `{luckeeParent}/luckee/{projectId}/{repoName}`.
 */
export const resolveProjectClonePaths = (
  luckeeParent: string,
  registry: ProjectRegistryEntry,
): ProjectClonePaths => {
  const luckeeRoot = path.join(luckeeParent, LUCKEE_DIR);
  const projectRoot = path.join(luckeeRoot, registry.id);
  const expressRepo = getExpressRegistryRepo(registry);
  const nextjsRepo = getNextjsRegistryRepo(registry);

  return {
    luckeeRoot,
    projectRoot,
    webDir: nextjsRepo ? path.join(projectRoot, nextjsRepo.repoName) : undefined,
    expressDir: expressRepo ? path.join(projectRoot, expressRepo.repoName) : undefined,
  };
};
