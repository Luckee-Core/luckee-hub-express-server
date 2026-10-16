import fs from 'fs';

import type {
  HookStatus,
  ProjectHookCheck,
  ProjectRegistryEntry,
  ProjectLocalEntry,
} from '../../services/projects/types';
import { resolveLiveApiPort } from './resolve-project-ports';
import { findOwnedNextWebUrl, isExpressHealthy } from './wait-for-project-ready';
import { apiDepsInstalled, detectApiRuntime } from './detect-api-runtime';
import {
  getExpressRegistryRepo,
  getStorageExpressRegistryRepo,
  projectHasExpressRepo,
  projectHasNextjsRepo,
  projectHasStorageExpressRepo,
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
  apiPort?: number;
  storageRunning?: boolean;
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
  const hasStorage = projectHasStorageExpressRepo(registry);
  const expressRepo = getExpressRegistryRepo(registry);
  const storageRepo = getStorageExpressRegistryRepo(registry);

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
  if (hasStorage) {
    hookChecks.push({
      id: 'storage-path',
      label: 'Storage path',
      ok: dirExists(local.storageExpressDir),
    });
  }

  const webOk = !hasWeb || dirExists(local.webDir);
  const expressOk = !hasExpress || dirExists(local.expressDir);
  const storageOk = !hasStorage || dirExists(local.storageExpressDir);

  if (!webOk || !expressOk || !storageOk) {
    return { hookStatus: 'missing', hookChecks };
  }

  if (hasWeb) {
    hookChecks.push({
      id: 'web-deps',
      label: 'Web installed',
      ok: hasNodeModules(local.webDir),
    });
  }
  const apiRuntime = detectApiRuntime(local.expressDir);
  if (hasExpress) {
    hookChecks.push({
      id: 'express-deps',
      label: apiRuntime === 'python' ? 'Python installed' : 'Express installed',
      ok: apiDepsInstalled(local.expressDir),
    });
  }
  if (hasStorage) {
    hookChecks.push({
      id: 'storage-deps',
      label: 'Storage installed',
      ok: apiDepsInstalled(local.storageExpressDir),
    });
  }

  const webConfigured = !hasWeb || hasNodeModules(local.webDir);
  const expressConfigured = !hasExpress || apiDepsInstalled(local.expressDir);
  const storageConfigured = !hasStorage || apiDepsInstalled(local.storageExpressDir);

  if (!webConfigured || !expressConfigured || !storageConfigured) {
    return { hookStatus: 'cloned', hookChecks };
  }

  if (!liveProbe) {
    if (hasExpress) {
      hookChecks.push({ id: 'api-running', label: 'API running', ok: false });
    }
    if (hasStorage) {
      hookChecks.push({ id: 'storage-running', label: 'Storage running', ok: false });
    }
    if (hasWeb) {
      hookChecks.push({ id: 'web-running', label: 'Web running', ok: false });
    }
    return { hookStatus: 'configured', hookChecks };
  }

  const registryApiPort = expressRepo?.defaultApiPort ?? 0;
  const healthPath = expressRepo?.healthPath ?? '/api/health';
  const resolvedApiPort = hasExpress
    ? resolveLiveApiPort(registry.id, registryApiPort, healthPath, local.expressDir)
    : undefined;
  const apiRunning = !hasExpress || resolvedApiPort !== undefined;

  const storagePort = storageRepo?.defaultApiPort ?? 0;
  const storageHealthPath = storageRepo?.healthPath ?? '/api/storage/health';
  const storageRunning =
    !hasStorage ||
    (storagePort > 0 &&
      isExpressHealthy(storagePort, storageHealthPath, local.storageExpressDir));

  const webUrl = hasWeb ? findOwnedNextWebUrl(local.webDir) : undefined;
  const webRunning = hasWeb && !!webUrl;

  if (hasExpress) {
    hookChecks.push({ id: 'api-running', label: 'API running', ok: apiRunning });
  }
  if (hasStorage) {
    hookChecks.push({ id: 'storage-running', label: 'Storage running', ok: storageRunning });
  }
  if (hasWeb) {
    hookChecks.push({ id: 'web-running', label: 'Web running', ok: webRunning });
  }

  const storageRunningFlag = hasStorage ? storageRunning : undefined;

  if (!hasWeb) {
    if (apiRunning) {
      return {
        hookStatus: 'ready',
        apiPort: resolvedApiPort,
        storageRunning: storageRunningFlag,
        hookChecks,
      };
    }
    return { hookStatus: 'configured', storageRunning: storageRunningFlag, hookChecks };
  }

  if (apiRunning && webRunning) {
    return {
      hookStatus: 'ready',
      webUrl,
      apiPort: resolvedApiPort,
      storageRunning: storageRunningFlag,
      hookChecks,
    };
  }
  if (apiRunning) {
    return {
      hookStatus: 'api_running',
      webUrl,
      apiPort: resolvedApiPort,
      storageRunning: storageRunningFlag,
      hookChecks,
    };
  }
  if (webRunning) {
    return { hookStatus: 'web_running', webUrl, storageRunning: storageRunningFlag, hookChecks };
  }

  return { hookStatus: 'configured', webUrl, storageRunning: storageRunningFlag, hookChecks };
};
