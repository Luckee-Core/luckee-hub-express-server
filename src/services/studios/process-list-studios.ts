import path from 'path';

import { mergeStudioConfig, probeStudioStatus, readLocalConfig, readRegistry } from '../../utils/studios';
import type { StudioCard } from './types';

type ProcessListStudiosOptions = {
  /** When true, curl/lsof each studio port (slower). Default false — filesystem checks only. */
  liveProbe?: boolean;
};

/**
 * Build studio cards from registry, local config, and optional live probes.
 */
export const processListStudios = (options: ProcessListStudiosOptions = {}): StudioCard[] => {
  const liveProbe = options.liveProbe ?? false;
  const hubRoot = path.resolve(__dirname, '../../..');
  const registry = readRegistry(hubRoot);
  const localConfig = readLocalConfig(hubRoot);

  return registry.map((entry) => {
    const local = localConfig.studios?.[entry.id];
    const { hookStatus, webUrl } = probeStudioStatus(entry, local, { liveProbe });

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
    };
  });
};
