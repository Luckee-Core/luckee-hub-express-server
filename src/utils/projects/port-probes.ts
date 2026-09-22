import { execSync } from 'child_process';
import path from 'path';

const PROBE_CURL_MAX_SECONDS = 0.5;

/**
 * True when something is listening on the TCP port.
 */
export const portListening = (port: number): boolean => {
  try {
    execSync(`lsof -iTCP:${port} -sTCP:LISTEN -t`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const getPidCwd = (pid: string): string | null => {
  try {
    const cwdOut = execSync(`lsof -a -p ${pid} -d cwd -Fn`, {
      encoding: 'utf8',
      timeout: 1000,
    });
    const line = cwdOut.split('\n').find((entry) => entry.startsWith('n'));
    if (!line) {
      return null;
    }
    return line.slice(1);
  } catch {
    return null;
  }
};

/**
 * Current working directories of processes listening on the TCP port.
 */
const getListeningProcessCwds = (port: number): string[] => {
  try {
    const pidRaw = execSync(`lsof -iTCP:${port} -sTCP:LISTEN -t`, {
      encoding: 'utf8',
      timeout: 1000,
    });
    const pids = [...new Set(pidRaw.trim().split('\n').map((pid) => pid.trim()).filter(Boolean))];
    const cwds: string[] = [];
    for (const pid of pids) {
      const cwd = getPidCwd(pid);
      if (cwd) {
        cwds.push(cwd);
      }
    }
    return cwds;
  } catch {
    return [];
  }
};

/**
 * True when a listener on the port has cwd at or under the project directory.
 * If `projectDir` is omitted, ownership is not constrained.
 */
export const portOwnedByDir = (port: number, projectDir?: string): boolean => {
  if (!projectDir) {
    return true;
  }
  const cwds = getListeningProcessCwds(port);
  if (cwds.length === 0) {
    return false;
  }
  const normalizedDir = path.resolve(projectDir);
  return cwds.some((cwd) => {
    const normalizedCwd = path.resolve(cwd);
    return (
      normalizedCwd === normalizedDir ||
      normalizedCwd.startsWith(`${normalizedDir}${path.sep}`)
    );
  });
};

const curlProbe = (args: string): string | null => {
  try {
    return execSync(`curl -fsS --max-time ${PROBE_CURL_MAX_SECONDS} ${args} 2>/dev/null`, {
      encoding: 'utf8',
      timeout: 1000,
    });
  } catch {
    return null;
  }
};

/**
 * True when Express health responds on the configured API port.
 * When `ownerDir` is set, the listener cwd must belong to that project directory.
 */
export const isExpressHealthOk = (
  apiPort: number,
  healthPath: string,
  ownerDir?: string,
): boolean => {
  if (!portListening(apiPort)) {
    return false;
  }
  if (!portOwnedByDir(apiPort, ownerDir)) {
    return false;
  }
  const url = `http://127.0.0.1:${apiPort}${healthPath}`;
  const out = curlProbe(`"${url}"`);
  if (out && out.includes('"status"') && out.includes('"ok"')) {
    return true;
  }
  return curlProbe(`-o /dev/null "${url}"`) !== null;
};

/**
 * True when Next.js dev server responds on the port.
 * When `ownerDir` is set, the listener cwd must belong to that project directory.
 */
export const isNextDevServerOnPort = (port: number, ownerDir?: string): boolean => {
  if (!portListening(port)) {
    return false;
  }
  if (!portOwnedByDir(port, ownerDir)) {
    return false;
  }
  const out = curlProbe(`-I "http://127.0.0.1:${port}"`);
  return !!out && out.toLowerCase().includes('x-powered-by: next.js');
};

/**
 * Find Next.js URL on the project's assigned web port (default scanMax=1).
 * Do not widen the scan — another hub project's dev server may be listening nearby.
 */
export const findWebUrlOnPorts = (
  webPortStart: number,
  scanMax = 1,
  ownerDir?: string,
): string | undefined => {
  for (let port = webPortStart; port < webPortStart + scanMax; port += 1) {
    if (isNextDevServerOnPort(port, ownerDir)) {
      return `http://localhost:${port}`;
    }
  }
  return undefined;
};
