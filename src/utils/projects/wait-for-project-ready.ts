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

const expressHealthOk = (apiPort: number, healthPath: string): boolean => isExpressHealthOk(apiPort, healthPath);

const isNextDevServer = (port: number): boolean => isNextDevServerOnPort(port);

/**
 * True when Express is listening and health returns ok.
 */
export const isExpressHealthy = (apiPort: number, healthPath: string): boolean =>
  portListening(apiPort) && expressHealthOk(apiPort, healthPath);

/**
 * Wait until Express health responds (up to maxSeconds).
 */
export const waitForExpressHealth = async (
  apiPort: number,
  healthPath: string,
  maxSeconds = 180,
): Promise<boolean> => {
  for (let i = 0; i < maxSeconds; i += 1) {
    if (portListening(apiPort) && expressHealthOk(apiPort, healthPath)) {
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
): number => {
  if (preferredApiPort <= 0) {
    return findAvailableApiPort(3010, scanMax);
  }
  if (isExpressHealthy(preferredApiPort, healthPath)) {
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
 * Find Next.js dev URL on the project's assigned web port only.
 * Hub assigns one web port per project — do not scan ahead or another project's dev server may match.
 */
export const findNextWebUrl = (
  webPort: number,
  scanMax = 1,
): string | undefined => findWebUrlOnPorts(webPort, scanMax);

/**
 * Poll until Next.js responds on the assigned web port (up to maxSeconds).
 */
export const waitForNextWebUrl = async (
  webPort: number,
  maxSeconds = 120,
): Promise<string | undefined> => {
  for (let i = 0; i < maxSeconds; i += 1) {
    if (!isNextDevServer(webPort)) {
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
