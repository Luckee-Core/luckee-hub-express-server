import { execSync } from 'child_process';

type RunShellCommandOptions = {
  cwd?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
  /** Stream stdout/stderr to the server terminal (for long-running brew commands). */
  inheritOutput?: boolean;
};

/**
 * Run a shell command and return trimmed stdout.
 */
export const runShellCommand = (command: string, options?: RunShellCommandOptions): string => {
  const inheritOutput = options?.inheritOutput === true;
  const result = execSync(command, {
    encoding: 'utf8',
    cwd: options?.cwd,
    timeout: options?.timeoutMs,
    env: { ...process.env, ...options?.env },
    stdio: inheritOutput ? 'inherit' : ['pipe', 'pipe', 'pipe'],
    maxBuffer: 10 * 1024 * 1024,
  });

  if (inheritOutput || result === undefined || result === null) {
    return '';
  }

  return result.trim();
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
