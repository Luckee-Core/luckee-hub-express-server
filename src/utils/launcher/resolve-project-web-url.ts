import fs from 'fs';

import { findNextWebUrl } from '../projects/wait-for-project-ready';
import { readResolvedProjectPorts } from '../projects/resolve-project-ports';
import { applyWebOpenPath } from './apply-web-open-path';

const HUB_TMP = '/tmp/luckee-hub';

const getAssignedWebPort = (
  webPortStart: number,
  resolved: ReturnType<typeof readResolvedProjectPorts>,
): number => {
  if (
    resolved?.webPort &&
    resolved.webPort > 0 &&
    resolved.webPort === resolved.webPortStart
  ) {
    return resolved.webPort;
  }
  return webPortStart;
};

/**
 * Resolve a project web URL from live probe on the assigned port, then trusted saved run output.
 */
export const resolveProjectWebUrl = (
  projectId: string,
  webPortStart: number,
  webOpenPath?: string,
  webDir?: string,
): string | undefined => {
  const resolved = readResolvedProjectPorts(projectId);
  const assignedPort = getAssignedWebPort(webPortStart, resolved);

  const liveUrl = findNextWebUrl(assignedPort, 1, webDir);
  if (liveUrl) {
    return applyWebOpenPath(liveUrl, webOpenPath);
  }

  if (
    resolved?.webUrl?.startsWith('http://') &&
    resolved.webPort === assignedPort &&
    resolved.webPort === resolved.webPortStart
  ) {
    return applyWebOpenPath(resolved.webUrl, webOpenPath);
  }

  const savedPath = `${HUB_TMP}/${projectId}-web-url.txt`;
  if (fs.existsSync(savedPath)) {
    const saved = fs.readFileSync(savedPath, 'utf8').trim();
    if (saved.startsWith('http://')) {
      const savedPort = Number(new URL(saved).port);
      if (savedPort === assignedPort) {
        return applyWebOpenPath(saved, webOpenPath);
      }
    }
  }

  return undefined;
};
