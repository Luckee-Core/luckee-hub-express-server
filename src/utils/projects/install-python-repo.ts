import fs from 'fs';
import path from 'path';

import { runNvmShellCommand } from './run-nvm-shell-command';

export type InstallPythonRepoResult = 'installed' | 'skipped';

/**
 * Create a virtualenv and install Python dependencies when .venv is missing.
 */
export const installPythonRepo = async (
  dir: string,
  nvmSh: string,
  onOutput?: (line: string) => void,
): Promise<InstallPythonRepoResult> => {
  if (fs.existsSync(path.join(dir, '.venv'))) {
    onOutput?.('.venv already present, skipping pip install');
    return 'skipped';
  }

  const pipInstall = fs.existsSync(path.join(dir, 'requirements.txt'))
    ? '.venv/bin/pip install -r requirements.txt'
    : '.venv/bin/pip install .';

  const result = await runNvmShellCommand({
    cwd: dir,
    nvmSh,
    command: `python3 -m venv .venv && ${pipInstall}`,
    timeoutMs: 10 * 60 * 1000,
    onOutput,
  });

  if (result.exitCode !== 0) {
    const message =
      result.stderr.trim() ||
      result.stdout.trim() ||
      `pip install failed in ${dir} (exit ${result.exitCode})`;
    throw new Error(message);
  }

  return 'installed';
};
