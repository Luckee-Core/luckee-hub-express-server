import { execSync } from 'child_process';

import {
  findWebUrlOnPorts,
  isExpressHealthOk,
  isNextDevServerOnPort,
  portListening,
} from './port-probes';

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
 * First port in scan range that is not listening (for new Express dev server).
 */
export const findAvailableApiPort = (
  apiPortStart: number,
  scanMax = 10,
): number => {
  for (let port = apiPortStart; port < apiPortStart + scanMax; port += 1) {
    if (!portListening(port)) {
      return port;
    }
  }
  return apiPortStart + scanMax;
};

/**
 * Resolve API port for Run: reuse healthy Express on preferred, else first free slot in scan range.
 */
export const resolveApiPortForRun = (
  preferredApiPort: number,
  healthPath: string,
  scanMax = 10,
  ownerDir?: string,
): number => {
  if (preferredApiPort <= 0) {
    return findAvailableApiPort(3010, scanMax);
  }
  if (isExpressHealthy(preferredApiPort, healthPath, ownerDir)) {
    return preferredApiPort;
  }
  if (!portListening(preferredApiPort)) {
    return preferredApiPort;
  }
  return findAvailableApiPort(preferredApiPort, scanMax);
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
