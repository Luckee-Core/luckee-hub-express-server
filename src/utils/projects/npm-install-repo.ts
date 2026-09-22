import fs from 'fs';
import path from 'path';

import { runNvmShellCommand } from './run-nvm-shell-command';

export type NpmInstallRepoResult = 'installed' | 'skipped';

/**
 * Run npm install in a repo directory using the same nvm prefix as embedded terminals.
 */
export const npmInstallRepo = async (
  dir: string,
  nvmSh: string,
  onOutput?: (line: string) => void,
): Promise<NpmInstallRepoResult> => {
  if (fs.existsSync(path.join(dir, 'node_modules'))) {
    onOutput?.('node_modules already present, skipping npm install');
    return 'skipped';
  }

  const result = await runNvmShellCommand({
    cwd: dir,
    nvmSh,
    command: 'npm install --loglevel verbose',
    timeoutMs: 10 * 60 * 1000,
    onOutput,
  });

  if (result.exitCode !== 0) {
    const message =
      result.stderr.trim() ||
      result.stdout.trim() ||
      `npm install failed in ${dir} (exit ${result.exitCode})`;
    throw new Error(message);
  }

  return 'installed';
};
