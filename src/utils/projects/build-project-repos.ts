import fs from 'fs';

import type {
  HubProjectRepo,
  ProjectLocalEntry,
  ProjectRegistryEntry,
} from '../../services/projects/types';
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
          : undefined;

    return {
      projectId: entry.id,
      repoType: repo.repoType,
      repoName: repo.repoName,
      repoUrl: toGithubRepoUrl(githubOrg, repo.repoName),
      localDir,
      dirExists: localDir ? dirExists(localDir) : undefined,
      depsInstalled: localDir ? hasNodeModules(localDir) : undefined,
      defaultApiPort: repo.repoType === 'express' ? repo.defaultApiPort : undefined,
      defaultWebPortStart: repo.repoType === 'nextjs' ? repo.defaultWebPortStart : undefined,
      healthPath: repo.repoType === 'express' ? repo.healthPath : undefined,
    };
  });
