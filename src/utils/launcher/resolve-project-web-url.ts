import fs from 'fs';

import { findNextWebUrl } from '../projects/wait-for-project-ready';
import { readResolvedProjectPorts } from '../projects/resolve-project-ports';

const HUB_TMP = '/tmp/luckee-hub';

/**
 * Resolve a project web URL from saved run output or live port scan.
 */
export const resolveProjectWebUrl = (
  projectId: string,
  webPortStart: number,
): string | undefined => {
  const resolved = readResolvedProjectPorts(projectId);
  if (resolved?.webUrl?.startsWith('http://')) {
    return resolved.webUrl;
  }

  const savedPath = `${HUB_TMP}/${projectId}-web-url.txt`;
  if (fs.existsSync(savedPath)) {
    const saved = fs.readFileSync(savedPath, 'utf8').trim();
    if (saved.startsWith('http://')) {
      return saved;
    }
  }

  return findNextWebUrl(webPortStart);
};
