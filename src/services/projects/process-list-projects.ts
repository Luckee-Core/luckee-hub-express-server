import path from 'path';

import { mergeProjectConfig, probeProjectStatus, readLocalConfig, readRegistry } from '../../utils/projects';
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

  return registry.map((entry) => {
    const local = localConfig.projects?.[entry.id];
    const { hookStatus, webUrl } = probeProjectStatus(entry, local, { liveProbe });

    return {
      id: entry.id,
      name: entry.name,
      description: entry.description,
      hookStatus,
      enabled: local?.enabled !== false,
      apiOnly: entry.apiOnly,
      webOnly: entry.webOnly,
      apiPort: entry.defaultApiPort,
      webUrl,
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
