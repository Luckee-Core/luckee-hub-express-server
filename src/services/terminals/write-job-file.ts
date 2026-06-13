import fs from 'fs';
import path from 'path';

import type { TerminalSessionInfo } from './types';

const HUB_TMP = '/tmp/luckee-hub/jobs';

export type LauncherJobFile = {
  jobId: string;
  projectId: string;
  status: 'running' | 'completed' | 'failed';
  message?: string;
  webUrl?: string;
  sessions?: TerminalSessionInfo[];
  updatedAt: string;
};

/**
 * Write launcher job state to disk for UI polling.
 */
export const writeJobFile = (job: LauncherJobFile): void => {
  fs.mkdirSync(HUB_TMP, { recursive: true });
  const filePath = path.join(HUB_TMP, `${job.jobId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(job));
};
