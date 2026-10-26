import {
  runTargetsInclude,
  type ProjectRunTarget,
} from '../launcher/run-project-targets';
import type { MergedProjectConfig, ProjectRegistryEntry } from '../projects/types';
import {
  killPortListenersOwnedByDir,
  projectHasExpressRepo,
  projectHasNextjsRepo,
  waitForPortRelease,
} from '../../utils/projects';
import { findOwnedNextPort } from '../../utils/projects/wait-for-project-ready';
import { killSession, listSessionRecords } from './session-registry';
import type { TerminalRole } from './types';

const killProjectSessionsForRole = (projectId: string, role: TerminalRole): void => {
  for (const record of listSessionRecords()) {
    if (record.projectId === projectId && record.role === role) {
      killSession(record.sessionId, true);
    }
  }
};

/**
 * Tear down hub PTYs and project-owned API/web listeners so Run can start fresh dev servers.
 */
export const stopProjectDevServersForRun = (
  projectId: string,
  entry: ProjectRegistryEntry,
  merged: MergedProjectConfig,
  targets: ProjectRunTarget[],
): void => {
  console.log('🚀 [terminals.stopProjectDevServersForRun] Stopping existing dev servers', {
    projectId,
    targets,
  });

  if (runTargetsInclude(targets, 'express')) {
    killProjectSessionsForRole(projectId, 'express');
  }
  if (runTargetsInclude(targets, 'web')) {
    killProjectSessionsForRole(projectId, 'web');
  }

  if (
    runTargetsInclude(targets, 'express') &&
    projectHasExpressRepo(entry) &&
    merged.expressDir &&
    merged.apiPort > 0
  ) {
    killPortListenersOwnedByDir(merged.apiPort, merged.expressDir);
    waitForPortRelease(merged.apiPort);
  }

  if (runTargetsInclude(targets, 'web') && projectHasNextjsRepo(entry) && merged.webDir) {
    const webPort = findOwnedNextPort(merged.webDir);
    if (webPort) {
      killPortListenersOwnedByDir(webPort, merged.webDir);
      waitForPortRelease(webPort);
    }
  }

  console.log('✅ [terminals.stopProjectDevServersForRun] Stop complete', { projectId });
};
