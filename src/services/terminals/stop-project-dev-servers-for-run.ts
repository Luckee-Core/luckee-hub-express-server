import type { MergedProjectConfig, ProjectRegistryEntry } from '../projects/types';
import {
  killPortListenersOwnedByDir,
  projectHasExpressRepo,
  projectHasNextjsRepo,
  waitForPortRelease,
} from '../../utils/projects';
import { findOwnedNextPort } from '../../utils/projects/wait-for-project-ready';
import { killProjectSessions } from './session-registry';

/**
 * Tear down hub PTYs and project-owned API/web listeners so Run can start fresh dev servers.
 */
export const stopProjectDevServersForRun = (
  projectId: string,
  entry: ProjectRegistryEntry,
  merged: MergedProjectConfig,
): void => {
  console.log('🚀 [terminals.stopProjectDevServersForRun] Stopping existing dev servers', {
    projectId,
  });

  killProjectSessions(projectId);

  if (projectHasExpressRepo(entry) && merged.expressDir && merged.apiPort > 0) {
    killPortListenersOwnedByDir(merged.apiPort, merged.expressDir);
    waitForPortRelease(merged.apiPort);
  }

  if (projectHasNextjsRepo(entry) && merged.webDir) {
    const webPort = findOwnedNextPort(merged.webDir);
    if (webPort) {
      killPortListenersOwnedByDir(webPort, merged.webDir);
      waitForPortRelease(webPort);
    }
  }

  console.log('✅ [terminals.stopProjectDevServersForRun] Stop complete', { projectId });
};
