import path from 'path';

import { probeProjectStatus, readLocalConfig, readRegistry, toGithubRepoUrl, DEFAULT_GITHUB_ORG } from '../../utils/projects';
import type { HubProject } from './types';

type ProcessListProjectsOptions = {
  /** When true, curl/lsof each project port (slower). Default false — filesystem checks only. */
  liveProbe?: boolean;
};

/**
 * Build project cards from registry, local config, and optional live probes.
 */
export const processListProjects = (options: ProcessListProjectsOptions = {}): HubProject[] => {
  const liveProbe = options.liveProbe ?? false;
  const hubRoot = path.resolve(__dirname, '../../..');
  const registry = readRegistry(hubRoot);
  const localConfig = readLocalConfig(hubRoot);
  const githubOrg = localConfig.githubOrg ?? DEFAULT_GITHUB_ORG;

  return registry.map((entry) => {
    const local = localConfig.projects?.[entry.id];
    const { hookStatus, webUrl, hookChecks } = probeProjectStatus(entry, local, { liveProbe });

    return {
      id: entry.id,
      name: entry.name,
      description: entry.description,
      hookStatus,
      hookChecks,
      enabled: local?.enabled !== false,
      apiOnly: entry.apiOnly,
      webOnly: entry.webOnly,
      apiPort: entry.defaultApiPort,
      webUrl,
      apiRepoUrl: toGithubRepoUrl(githubOrg, entry.apiRepo),
      webRepoUrl: toGithubRepoUrl(githubOrg, entry.webRepo),
      paths: local
        ? {
            webDir: local.webDir,
            expressDir: local.expressDir,
            workspaceFile: local.workspaceFile,
          }
        : undefined,
      localDatabaseSupported: !!entry.localDatabase,
    };
  });
};
