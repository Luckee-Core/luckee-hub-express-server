import fs from 'fs';
import path from 'path';

import { runNvmShellCommand } from './run-nvm-shell-command';

export type NpmInstallRepoResult = 'installed' | 'skipped';

/**
 * Run npm install in a repo directory using the same nvm prefix as embedded terminals.
 */
export const npmInstallRepo = async (dir: string, nvmSh: string): Promise<NpmInstallRepoResult> => {
  if (fs.existsSync(path.join(dir, 'node_modules'))) {
    return 'skipped';
  }

  const result = await runNvmShellCommand({
    cwd: dir,
    nvmSh,
    command: 'npm install',
    timeoutMs: 10 * 60 * 1000,
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
