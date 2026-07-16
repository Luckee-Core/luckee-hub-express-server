import { spawn } from 'child_process';

import { buildNvmShellPrefix, shellEscape } from './build-nvm-shell-prefix';

const OUTPUT_TAIL_MAX = 4000;

type RunNvmShellCommandInput = {
  cwd: string;
  nvmSh: string;
  command: string;
  timeoutMs?: number;
};

type RunNvmShellCommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

const tail = (value: string): string => {
  if (value.length <= OUTPUT_TAIL_MAX) {
    return value;
  }
  return value.slice(-OUTPUT_TAIL_MAX);
};

/**
 * Run a shell command under nvm in zsh; drain stdout/stderr to avoid pipe deadlocks.
 */
export const runNvmShellCommand = (
  input: RunNvmShellCommandInput,
): Promise<RunNvmShellCommandResult> => {
  const timeoutMs = input.timeoutMs ?? 10 * 60 * 1000;
  const nvm = buildNvmShellPrefix(input.nvmSh);
  const script = `${nvm} && cd '${shellEscape(input.cwd)}' && ${input.command}`;

  return new Promise((resolve, reject) => {
    const child = spawn('/bin/zsh', ['-lc', script], {
      cwd: input.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeoutId = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      const exitCode = code ?? 1;

      if (timedOut) {
        reject(new Error(`Command timed out after ${Math.round(timeoutMs / 1000)}s in ${input.cwd}`));
        return;
      }

      resolve({
        exitCode,
        stdout: tail(stdout),
        stderr: tail(stderr),
      });
    });
  });
};
