import fs from 'fs';
import path from 'path';

const LOG_DIR = '/tmp/luckee-hub/logs';
const TAIL_LINES = 80;

export type SetupDebugLog = {
  filePath: string;
  write: (message: string) => void;
  tail: () => string;
};

/**
 * Append setup debug lines to the hub server console and `/tmp/luckee-hub/logs/<jobId>.log`.
 */
export const createSetupDebugLog = (jobId: string): SetupDebugLog => {
  const filePath = path.join(LOG_DIR, `${jobId}.log`);
  const lines: string[] = [];
  fs.mkdirSync(LOG_DIR, { recursive: true });

  const write = (message: string): void => {
    console.log(message);
    fs.appendFileSync(filePath, `${new Date().toISOString()} ${message}\n`);
    lines.push(message);
    if (lines.length > TAIL_LINES) {
      lines.shift();
    }
  };

  write(`🚀 [launcher.createSetupDebugLog] Debug log ${filePath}`);

  return {
    filePath,
    write,
    tail: () => lines.join('\n'),
  };
};
