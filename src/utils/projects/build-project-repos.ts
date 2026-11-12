import fs from 'fs';

import type {
  HubProjectRepo,
  HubProjectRepoRole,
  ProjectLocalEntry,
  ProjectRegistryEntry,
} from '../../services/projects/types';
import { apiDepsInstalled, detectApiRuntime } from './detect-api-runtime';
import { toGithubRepoUrl } from './to-github-repo-url';

const dirExists = (p?: string): boolean => !!(p && fs.existsSync(p));

const hasNodeModules = (p?: string): boolean => dirExists(p && `${p}/node_modules`);

const resolveRepoLocalDir = (
  entry: ProjectRegistryEntry,
  local: ProjectLocalEntry | undefined,
  role: HubProjectRepoRole,
  repoName: string,
): string | undefined => {
  if (local?.repoDirs?.[repoName]) {
    return local.repoDirs[repoName];
  }
  if (role === 'express') {
    return local?.expressDir;
  }
  if (role === 'storage') {
    return local?.storageExpressDir;
  }
  if (role === 'dispatcher') {
    return local?.dispatcherDir;
  }
  if (role === 'web' || role === 'console' || role === 'dispatcher-web') {
    const firstNext = entry.repos.find((r) => r.repoType === 'nextjs');
    if (firstNext?.repoName === repoName) {
      return local?.webDir;
    }
  }
  return undefined;
};

/**
 * Build flat project↔repo rows from registry config, local paths, and filesystem probes.
 */
export const buildProjectRepos = (
  entry: ProjectRegistryEntry,
  local: ProjectLocalEntry | undefined,
  githubOrg: string,
): HubProjectRepo[] => {
  const projectGithubOrg = entry.githubOrg ?? githubOrg;

  return entry.repos.map((repo) => {
    const localDir = resolveRepoLocalDir(entry, local, repo.role, repo.repoName);

    const isApiLikeRepo = repo.repoType === 'express' || repo.repoType === 'storage-express';

    return {
      projectId: entry.id,
      repoType: repo.repoType,
      role: repo.role,
      repoName: repo.repoName,
      repoUrl: toGithubRepoUrl(projectGithubOrg, repo.repoName),
      localDir,
      dirExists: localDir ? dirExists(localDir) : undefined,
      depsInstalled: localDir
        ? isApiLikeRepo
          ? apiDepsInstalled(localDir)
          : hasNodeModules(localDir)
        : undefined,
      apiRuntime: isApiLikeRepo ? detectApiRuntime(localDir) : undefined,
      defaultApiPort: isApiLikeRepo ? repo.defaultApiPort : undefined,
      defaultWebPortStart: repo.repoType === 'nextjs' ? repo.defaultWebPortStart : undefined,
      healthPath: isApiLikeRepo ? repo.healthPath : undefined,
    };
  });
};
