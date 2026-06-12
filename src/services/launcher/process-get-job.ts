import fs from 'fs';
import path from 'path';

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
  return parsed;
};
