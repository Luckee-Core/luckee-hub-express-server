import { execSync } from 'child_process';

import {
  findWebUrlOnPorts,
  isExpressHealthOk,
  isNextDevServerOnPort,
  listListeningTcpPorts,
  portListening,
} from './port-probes';

/** Next.js dev starts here and walks forward when the port is taken. */
export const WEB_PORT_WALK_START = 3000;
export const WEB_PORT_WALK_END = 3100;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const curlQuiet = (args: string): string | null => {
  try {
    return execSync(`curl -fsS ${args} 2>/dev/null`, { encoding: 'utf8', timeout: 3000 });
  } catch {
    return null;
  }
};

/**
 * True when Express is listening and health returns ok.
 * When `ownerDir` is set, ignore another project's process on the same port.
 */
export const isExpressHealthy = (
  apiPort: number,
  healthPath: string,
  ownerDir?: string,
): boolean => portListening(apiPort) && isExpressHealthOk(apiPort, healthPath, ownerDir);

/**
 * Wait until Express health responds (up to maxSeconds).
 */
export const waitForExpressHealth = async (
  apiPort: number,
  healthPath: string,
  maxSeconds = 180,
  ownerDir?: string,
): Promise<boolean> => {
  for (let i = 0; i < maxSeconds; i += 1) {
    if (isExpressHealthy(apiPort, healthPath, ownerDir)) {
      return true;
    }
    await sleep(1000);
  }
  return false;
};

/**
 * First port in the scan range that is not listening and not in `avoid`.
 */
export const findFirstFreePort = (
  start: number,
  scanMax = 101,
  avoid: number[] = [],
): number => {
  const blocked = new Set(avoid);
  for (let port = start; port < start + scanMax; port += 1) {
    if (blocked.has(port)) {
      continue;
    }
    if (!portListening(port)) {
      return port;
    }
  }
  return start + scanMax;
};

/**
 * First port in scan range that is not listening (for new Express dev server).
 */
export const findAvailableApiPort = (
  apiPortStart: number,
  scanMax = 10,
  avoid: number[] = [],
): number => findFirstFreePort(apiPortStart, scanMax, avoid);

/**
 * Resolve API port for Run: reuse healthy Express on preferred, else first free slot.
 * `avoid` keeps the API off a port the web walk is about to use.
 */
export const resolveApiPortForRun = (
  preferredApiPort: number,
  healthPath: string,
  scanMax = 10,
  ownerDir?: string,
  avoid: number[] = [],
): number => {
  const blocked = new Set(avoid);
  if (preferredApiPort <= 0) {
    return findAvailableApiPort(3010, scanMax, avoid);
  }
  if (
    !blocked.has(preferredApiPort) &&
    isExpressHealthy(preferredApiPort, healthPath, ownerDir)
  ) {
    return preferredApiPort;
  }
  if (!blocked.has(preferredApiPort) && !portListening(preferredApiPort)) {
    return preferredApiPort;
  }
  return findAvailableApiPort(preferredApiPort, scanMax, avoid);
};

/**
 * First port in scan range that is not listening (for new Next.js dev server).
 */
export const findAvailableWebPort = (
  webPortStart: number,
  scanMax = 10,
): number => {
  for (let port = webPortStart; port < webPortStart + scanMax; port += 1) {
    if (!portListening(port)) {
      return port;
    }
  }
  return webPortStart + scanMax;
};

/**
 * Resolve web port for Run: reuse Next.js already on preferred, else first free slot in scan range.
 * Next.js 16 refuses a second `next dev` in the same directory, so never bump off an existing project server.
 */
export const resolveWebPortForRun = (
  preferredWebPort: number,
  scanMax = 10,
  ownerDir?: string,
): number => {
  if (preferredWebPort <= 0) {
    return preferredWebPort;
  }
  if (isNextDevServerOnPort(preferredWebPort, ownerDir)) {
    return preferredWebPort;
  }
  if (!portListening(preferredWebPort)) {
    return preferredWebPort;
  }
  return findAvailableWebPort(preferredWebPort, scanMax);
};

/**
 * Find Next.js dev URL on the project's assigned web port only.
 * Hub assigns one web port per project — do not scan ahead or another project's dev server may match.
 */
export const findNextWebUrl = (
  webPort: number,
  scanMax = 1,
  ownerDir?: string,
): string | undefined => findWebUrlOnPorts(webPort, scanMax, ownerDir);

/**
 * Next.js for this repo anywhere in the 3000–3100 walk (cwd must match `ownerDir`).
 */
export const findOwnedNextWebUrl = (ownerDir?: string): string | undefined => {
  const ports = listListeningTcpPorts()
    .filter((port) => port >= WEB_PORT_WALK_START && port <= WEB_PORT_WALK_END)
    .sort((a, b) => a - b);
  for (const port of ports) {
    if (isNextDevServerOnPort(port, ownerDir)) {
      return `http://localhost:${port}`;
    }
  }
  return undefined;
};

/**
 * Port of this repo's Next.js dev server, if one is already listening.
 */
export const findOwnedNextPort = (ownerDir?: string): number | undefined => {
  const url = findOwnedNextWebUrl(ownerDir);
  if (!url) {
    return undefined;
  }
  const port = Number(new URL(url).port);
  return port > 0 ? port : undefined;
};

/**
 * Poll until Next.js responds on the assigned web port (up to maxSeconds).
 */
export const waitForNextWebUrl = async (
  webPort: number,
  maxSeconds = 120,
  ownerDir?: string,
): Promise<string | undefined> => {
  for (let i = 0; i < maxSeconds; i += 1) {
    if (!isNextDevServerOnPort(webPort, ownerDir)) {
      await sleep(1000);
      continue;
    }
    const url = `http://localhost:${webPort}`;
    const ok = curlQuiet(`-o /dev/null "${url}"`);
    if (ok !== null) {
      return url;
    }
    await sleep(1000);
  }
  return undefined;
};

/**
 * Poll until this repo's Next.js is listening somewhere in the 3000–3100 walk.
 */
export const waitForOwnedNextWebUrl = async (
  maxSeconds = 120,
  ownerDir?: string,
): Promise<string | undefined> => {
  for (let i = 0; i < maxSeconds; i += 1) {
    const url = findOwnedNextWebUrl(ownerDir);
    if (url) {
      const ok = curlQuiet(`-o /dev/null "${url}"`);
      if (ok !== null) {
        return url;
      }
    }
    await sleep(1000);
  }
  return undefined;
};
