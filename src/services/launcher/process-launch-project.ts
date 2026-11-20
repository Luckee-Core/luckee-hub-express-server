import fs from 'fs';

import {
  apiDepsInstalled,
  mergeProjectConfig,
  projectHasExpressRepo,
  projectHasNextjsRepo,
  readLocalConfig,
  readRegistry,
} from '../../utils/projects';
import { getHubRoot } from '../../utils/projects/get-hub-root';
import { probeProjectLaunchState } from '../../utils/launcher';
import { processRunEmbedded } from '../terminals/process-run-embedded';
import { getRunningLaunchJobId, setRunningLaunchJobId } from './active-launch-jobs';
import { processRunStorageExpress } from './process-run-storage-express';
import type { ProjectRunTarget } from './run-project-targets';
import type { LaunchProjectResult } from './types';

export type LaunchProjectError = { error: string; status: 400 | 500 };

/**
 * Launch link (ADR 035): return the project's live web origin, or start what is missing
 * (storage when its data plane is `direct`, Express, Web) without opening Chrome.
 */
export const processLaunchProject = (
  projectId: string,
): LaunchProjectResult | LaunchProjectError => {
  const hubRoot = getHubRoot();
  const entry = readRegistry(hubRoot).find((project) => project.id === projectId);
  if (!entry) {
    return { error: 'Project not found', status: 400 };
  }
  if (!projectHasNextjsRepo(entry)) {
    return { error: `${entry.name} has no web app to open`, status: 400 };
  }

  const merged = mergeProjectConfig(entry, readLocalConfig(hubRoot));
  const setupMessage = `Run Setup for ${entry.name} in Luckee Hub first`;
  if (!merged?.webDir || !fs.existsSync(`${merged.webDir}/node_modules`)) {
    return { error: `${setupMessage} (web app not installed)`, status: 400 };
  }
  if (
    projectHasExpressRepo(entry) &&
    (!merged.expressDir || !apiDepsInstalled(merged.expressDir))
  ) {
    return { error: `${setupMessage} (API not installed)`, status: 400 };
  }

  const runningJobId = getRunningLaunchJobId(projectId);
  if (runningJobId) {
    console.log('✅ [launcher.processLaunchProject] Reusing running launch job', {
      projectId,
      jobId: runningJobId,
    });
    return { status: 'starting', jobId: runningJobId, message: `Starting ${entry.name}...` };
  }

  const state = probeProjectLaunchState(merged);
  console.log('🔍 [launcher.processLaunchProject] Launch state', { projectId, ...state });

  if (state.expressOk && state.webUrl && (!state.storageNeeded || state.storageOk)) {
    return { status: 'ready', webUrl: state.webUrl };
  }

  if (state.storageNeeded && !state.storageOk) {
    const storage = processRunStorageExpress(projectId);
    if ('error' in storage) {
      return { error: `Storage: ${storage.error}`, status: storage.status };
    }
  }

  if (state.expressOk && state.webUrl) {
    // Only storage was missing: it is starting in its own terminal; Web and Express are up.
    return { status: 'ready', webUrl: state.webUrl };
  }

  // Express down → restart Web too so its injected API URL matches the port Run picks.
  const targets: ProjectRunTarget[] = state.expressOk ? ['web'] : ['express', 'web'];

  const run = processRunEmbedded(projectId, { targets, openChrome: false });
  if (!run) {
    return { error: 'Project not configured in Luckee Hub', status: 400 };
  }
  setRunningLaunchJobId(projectId, run.jobId);

  console.log('🚀 [launcher.processLaunchProject] Started launch run', {
    projectId,
    jobId: run.jobId,
    targets,
  });
  return {
    status: 'starting',
    jobId: run.jobId,
    message: targets.includes('express')
      ? `Starting ${entry.name} API and web...`
      : `Starting ${entry.name} web...`,
  };
};
