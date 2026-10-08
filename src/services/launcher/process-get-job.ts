import fs from 'fs';
import path from 'path';

import { getSession } from '../terminals/session-registry';
import type { LauncherJob } from './types';

const HUB_TMP = '/tmp/luckee-hub/jobs';

/**
 * Read launcher job status from disk.
 */
export const processGetJob = (jobId: string): LauncherJob | null => {
  const filePath = path.join(HUB_TMP, `${jobId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw) as LauncherJob;
  if (parsed.sessions) {
    parsed.sessions = parsed.sessions.filter((session) => getSession(session.sessionId));
  }
  return parsed;
};
