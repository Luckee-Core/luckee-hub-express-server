import fs from 'fs';

import type {
  HookStatus,
  ProjectHookCheck,
  ProjectRegistryEntry,
  ProjectLocalEntry,
} from '../../services/projects/types';
import { findWebUrlOnPorts, isExpressHealthOk } from './port-probes';
import {
  getExpressRegistryRepo,
  getNextjsRegistryRepo,
  projectHasExpressRepo,
  projectHasNextjsRepo,
} from './get-registry-repo';

const dirExists = (p?: string): boolean => !!(p && fs.existsSync(p));

const hasNodeModules = (p?: string): boolean => dirExists(p && `${p}/node_modules`);

type ProbeProjectStatusOptions = {
  /** When false, skip curl/lsof health checks (instant catalog load). */
  liveProbe?: boolean;
};

type ProbeProjectStatusResult = {
  hookStatus: HookStatus;
  webUrl?: string;
  hookChecks: ProjectHookCheck[];
};

/**
 * Compute hooked-up status for a project from registry + local paths + optional live probes.
 */
export const probeProjectStatus = (
  registry: ProjectRegistryEntry,
  local?: ProjectLocalEntry,
  options: ProbeProjectStatusOptions = {},
): ProbeProjectStatusResult => {
  const liveProbe = options.liveProbe ?? false;
  const hasWeb = projectHasNextjsRepo(registry);
  const hasExpress = projectHasExpressRepo(registry);
  const expressRepo = getExpressRegistryRepo(registry);
  const nextjsRepo = getNextjsRegistryRepo(registry);

  const hookChecks: ProjectHookCheck[] = [
    {
      id: 'hub-configured',
      label: 'Hub configured',
      ok: !!local && local.enabled !== false,
    },
  ];

  if (!local) {
    return { hookStatus: 'catalog', hookChecks };
  }
  if (local.enabled === false) {
    return { hookStatus: 'disabled', hookChecks };
  }

  if (hasWeb) {
    hookChecks.push({
      id: 'web-path',
      label: 'Web path',
      ok: dirExists(local.webDir),
    });
  }
  if (hasExpress) {
    hookChecks.push({
      id: 'express-path',
      label: 'Express path',
      ok: dirExists(local.expressDir),
    });
  }

  const webOk = !hasWeb || dirExists(local.webDir);
  const expressOk = !hasExpress || dirExists(local.expressDir);

  if (!webOk || !expressOk) {
    return { hookStatus: 'missing', hookChecks };
  }

  if (hasWeb) {
    hookChecks.push({
      id: 'web-deps',
      label: 'Web installed',
      ok: hasNodeModules(local.webDir),
    });
  }
  if (hasExpress) {
    hookChecks.push({
      id: 'express-deps',
      label: 'Express installed',
      ok: hasNodeModules(local.expressDir),
    });
  }

  const webConfigured = !hasWeb || hasNodeModules(local.webDir);
  const expressConfigured = !hasExpress || hasNodeModules(local.expressDir);

  if (!webConfigured || !expressConfigured) {
    return { hookStatus: 'cloned', hookChecks };
  }

  if (!liveProbe) {
    if (hasExpress) {
      hookChecks.push({ id: 'api-running', label: 'API running', ok: false });
    }
    if (hasWeb) {
      hookChecks.push({ id: 'web-running', label: 'Web running', ok: false });
    }
    return { hookStatus: 'configured', hookChecks };
  }

  const apiRunning =
    !hasExpress ||
    isExpressHealthOk(
      expressRepo?.defaultApiPort ?? 0,
      expressRepo?.healthPath ?? '/api/health',
    );

  const webPortStart = local.webPortStart ?? nextjsRepo?.defaultWebPortStart ?? 3000;
  const webUrl = hasWeb ? findWebUrlOnPorts(webPortStart, 1) : undefined;
  const webRunning = hasWeb && !!webUrl;

  if (hasExpress) {
    hookChecks.push({ id: 'api-running', label: 'API running', ok: apiRunning });
  }
  if (hasWeb) {
    hookChecks.push({ id: 'web-running', label: 'Web running', ok: webRunning });
  }

  if (!hasWeb) {
    if (apiRunning) {
      return { hookStatus: 'ready', hookChecks };
    }
    return { hookStatus: 'configured', hookChecks };
  }

  if (apiRunning && webRunning) {
    return { hookStatus: 'ready', webUrl, hookChecks };
  }
  if (apiRunning) {
    return { hookStatus: 'api_running', webUrl, hookChecks };
  }
  if (webRunning) {
    return { hookStatus: 'web_running', webUrl, hookChecks };
  }

  return { hookStatus: 'configured', webUrl, hookChecks };
};
