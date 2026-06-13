import fs from 'fs';

import type { HookStatus, ProjectRegistryEntry, ProjectLocalEntry } from '../../services/projects/types';
import { findWebUrlOnPorts, isExpressHealthOk } from './port-probes';

const dirExists = (p?: string): boolean => !!(p && fs.existsSync(p));

const hasNodeModules = (p?: string): boolean => dirExists(p && `${p}/node_modules`);

type ProbeProjectStatusOptions = {
  /** When false, skip curl/lsof health checks (instant catalog load). */
  liveProbe?: boolean;
};

/**
 * Compute hooked-up status for a project from registry + local paths + optional live probes.
 */
export const probeProjectStatus = (
  registry: ProjectRegistryEntry,
  local?: ProjectLocalEntry,
  options: ProbeProjectStatusOptions = {},
): { hookStatus: HookStatus; webUrl?: string } => {
  const liveProbe = options.liveProbe ?? false;

  if (!local) {
    return { hookStatus: 'catalog' };
  }
  if (local.enabled === false) {
    return { hookStatus: 'disabled' };
  }

  const webOk = !registry.webRepo || dirExists(local.webDir);
  const expressOk = registry.apiOnly || !registry.apiRepo || dirExists(local.expressDir);

  if (!webOk || !expressOk) {
    return { hookStatus: 'missing' };
  }

  const webConfigured = registry.apiOnly || hasNodeModules(local.webDir);
  const expressConfigured =
    registry.webOnly || registry.apiOnly || hasNodeModules(local.expressDir);

  if (!webConfigured || !expressConfigured) {
    return { hookStatus: 'cloned' };
  }

  if (!liveProbe) {
    return { hookStatus: 'configured' };
  }

  const apiRunning =
    registry.webOnly ||
    (registry.apiRepo && isExpressHealthOk(registry.defaultApiPort, registry.healthPath));

  const webPortStart = local.webPortStart ?? registry.defaultWebPortStart;
  const webUrl = registry.apiOnly ? undefined : findWebUrlOnPorts(webPortStart, 1);

  const webRunning = !registry.apiOnly && !!webUrl;

  if (registry.apiOnly) {
    if (apiRunning) {
      return { hookStatus: 'ready' };
    }
    return { hookStatus: 'configured' };
  }

  if (apiRunning && webRunning) {
    return { hookStatus: 'ready', webUrl };
  }
  if (apiRunning) {
    return { hookStatus: 'api_running', webUrl };
  }
  if (webRunning) {
    return { hookStatus: 'web_running', webUrl };
  }

  return { hookStatus: 'configured', webUrl };
};
