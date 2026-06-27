import path from 'path';

import {
  buildProjectRepos,
  DEFAULT_GITHUB_ORG,
  getExpressRegistryRepo,
  probeProjectStatus,
  readLocalConfig,
  readRegistry,
  resolveProjectWorkspaceFile,
} from '../../utils/projects';
import type { ListProjectsData } from './types';

type ProcessListProjectsOptions = {
  /** When true, curl/lsof each project port (slower). Default false — filesystem checks only. */
  liveProbe?: boolean;
};

/**
 * Build project cards and flat repo rows from registry, local config, and optional live probes.
 */
export const processListProjects = (
  options: ProcessListProjectsOptions = {},
): ListProjectsData => {
  const liveProbe = options.liveProbe ?? false;
  const hubRoot = path.resolve(__dirname, '../../..');
  const registry = readRegistry(hubRoot);
  const localConfig = readLocalConfig(hubRoot);
  const githubOrg = localConfig.githubOrg ?? DEFAULT_GITHUB_ORG;

  const repos = registry.flatMap((entry) => {
    const local = localConfig.projects?.[entry.id];
    return buildProjectRepos(entry, local, githubOrg);
  });

  const projects = registry.map((entry) => {
    const local = localConfig.projects?.[entry.id];
    const { hookStatus, webUrl } = probeProjectStatus(entry, local, { liveProbe });
    const expressRepo = getExpressRegistryRepo(entry);

    return {
      id: entry.id,
      name: entry.name,
      description: entry.description,
      hookStatus,
      enabled: local?.enabled !== false,
      apiPort: expressRepo?.defaultApiPort ?? 0,
      webUrl,
      paths: local ? { workspaceFile: resolveProjectWorkspaceFile(local) } : undefined,
      localDatabaseSupported: !!entry.localDatabase,
    };
  });

  return { projects, repos };
};
