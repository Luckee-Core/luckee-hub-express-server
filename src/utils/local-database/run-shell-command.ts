import { execSync } from 'child_process';

/**
 * Run a shell command and return trimmed stdout.
 */
export const runShellCommand = (command: string, options?: { cwd?: string }): string => {
  return execSync(command, {
    encoding: 'utf8',
    cwd: options?.cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
};

/**
 * Run a shell command; return null on failure.
 */
export const runShellCommandQuiet = (command: string): string | null => {
  try {
    return runShellCommand(command);
  } catch {
    return null;
  }
};
