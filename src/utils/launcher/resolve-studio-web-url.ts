import fs from 'fs';

import { findNextWebUrl } from '../studios/wait-for-studio-ready';

const HUB_TMP = '/tmp/luckee-hub';

/**
 * Resolve a studio web URL from saved run output or live port scan.
 */
export const resolveStudioWebUrl = (
  studioId: string,
  webPortStart: number,
): string | undefined => {
  const savedPath = `${HUB_TMP}/${studioId}-web-url.txt`;
  if (fs.existsSync(savedPath)) {
    const saved = fs.readFileSync(savedPath, 'utf8').trim();
    if (saved.startsWith('http://')) {
      return saved;
    }
  }

  return findNextWebUrl(webPortStart);
};
