import { spawn } from 'child_process';

import { buildNvmShellPrefix, shellEscape } from './build-nvm-shell-prefix';

const OUTPUT_TAIL_MAX = 4000;

type RunNvmShellCommandInput = {
  cwd: string;
  nvmSh: string;
  command: string;
  timeoutMs?: number;
  onOutput?: (line: string) => void;
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

const pushLines = (pending: { value: string }, chunk: string, onLine: (line: string) => void): void => {
  pending.value += chunk;
  const parts = pending.value.split(/\r\n|\n|\r/);
  pending.value = parts.pop() ?? '';
  for (const part of parts) {
    const line = part.trim();
    if (line) {
      onLine(line);
    }
  }
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
  const startedMs = Date.now();
  const emit = (line: string): void => {
    if (input.onOutput) {
      input.onOutput(line);
      return;
    }
    console.log(`📥 [projects.runNvmShellCommand] ${line}`);
  };

  console.log('🚀 [projects.runNvmShellCommand] Starting', {
    cwd: input.cwd,
    command: input.command,
  });
  emit(`$ ${input.command}`);

  return new Promise((resolve, reject) => {
    const child = spawn('/bin/zsh', ['-lc', script], {
      cwd: input.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const pendingOut = { value: '' };
    const pendingErr = { value: '' };

    const timeoutId = setTimeout(() => {
      timedOut = true;
      const message = `Timed out after ${Math.round(timeoutMs / 1000)}s`;
      console.error('❌ [projects.runNvmShellCommand] Timed out', {
        cwd: input.cwd,
        command: input.command,
        timeoutMs,
      });
      emit(message);
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer | string) => {
      const text = chunk.toString();
      stdout += text;
      pushLines(pendingOut, text, emit);
    });

    child.stderr.on('data', (chunk: Buffer | string) => {
      const text = chunk.toString();
      stderr += text;
      pushLines(pendingErr, text, emit);
    });

    child.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      if (pendingOut.value.trim()) {
        emit(pendingOut.value.trim());
      }
      if (pendingErr.value.trim()) {
        emit(pendingErr.value.trim());
      }
      const exitCode = code ?? 1;
      const elapsedSec = Math.round((Date.now() - startedMs) / 1000);

      if (timedOut) {
        reject(new Error(`Command timed out after ${Math.round(timeoutMs / 1000)}s in ${input.cwd}`));
        return;
      }

      const finishedMessage = `exit ${exitCode} after ${elapsedSec}s`;
      if (exitCode === 0) {
        console.log('✅ [projects.runNvmShellCommand] Finished', {
          cwd: input.cwd,
          command: input.command,
          exitCode,
          elapsedSec,
        });
      } else {
        console.error('❌ [projects.runNvmShellCommand] Failed', {
          cwd: input.cwd,
          command: input.command,
          exitCode,
          elapsedSec,
        });
      }
      emit(finishedMessage);

      resolve({
        exitCode,
        stdout: tail(stdout),
        stderr: tail(stderr),
      });
    });
  });
};
