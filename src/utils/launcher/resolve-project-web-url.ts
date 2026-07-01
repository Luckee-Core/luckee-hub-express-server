import fs from 'fs';

import { findNextWebUrl } from '../projects/wait-for-project-ready';
import { readResolvedProjectPorts } from '../projects/resolve-project-ports';

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
): string | undefined => {
  const resolved = readResolvedProjectPorts(projectId);
  const assignedPort = getAssignedWebPort(webPortStart, resolved);

  const liveUrl = findNextWebUrl(assignedPort);
  if (liveUrl) {
    return liveUrl;
  }

  if (
    resolved?.webUrl?.startsWith('http://') &&
    resolved.webPort === assignedPort &&
    resolved.webPort === resolved.webPortStart
  ) {
    return resolved.webUrl;
  }

  const savedPath = `${HUB_TMP}/${projectId}-web-url.txt`;
  if (fs.existsSync(savedPath)) {
    const saved = fs.readFileSync(savedPath, 'utf8').trim();
    if (saved.startsWith('http://')) {
      const savedPort = Number(new URL(saved).port);
      if (savedPort === assignedPort) {
        return saved;
      }
    }
  }

  return undefined;
};
