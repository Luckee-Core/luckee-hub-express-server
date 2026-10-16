import fs from 'fs';

import type {
  HubProjectRepo,
  ProjectLocalEntry,
  ProjectRegistryEntry,
} from '../../services/projects/types';
import { apiDepsInstalled, detectApiRuntime } from './detect-api-runtime';
import { toGithubRepoUrl } from './to-github-repo-url';

const dirExists = (p?: string): boolean => !!(p && fs.existsSync(p));

const hasNodeModules = (p?: string): boolean => dirExists(p && `${p}/node_modules`);

/**
 * Build flat project↔repo rows from registry config, local paths, and filesystem probes.
 */
export const buildProjectRepos = (
  entry: ProjectRegistryEntry,
  local: ProjectLocalEntry | undefined,
  githubOrg: string,
): HubProjectRepo[] =>
  entry.repos.map((repo) => {
    const localDir =
      repo.repoType === 'nextjs'
        ? local?.webDir
        : repo.repoType === 'express'
          ? local?.expressDir
          : repo.repoType === 'storage-express'
            ? local?.storageExpressDir
            : undefined;

    const isApiLikeRepo = repo.repoType === 'express' || repo.repoType === 'storage-express';

    return {
      projectId: entry.id,
      repoType: repo.repoType,
      repoName: repo.repoName,
      repoUrl: toGithubRepoUrl(githubOrg, repo.repoName),
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
