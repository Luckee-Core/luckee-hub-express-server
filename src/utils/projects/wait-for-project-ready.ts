import {
  fetchApiHealth,
  findWebUrlOnPorts,
  isApiProcessListening,
  isNextDevServerOnPort,
  listListeningTcpPorts,
  portListening,
} from './port-probes';

/** Next.js dev starts here and walks forward when the port is taken. */
export const WEB_PORT_WALK_START = 3000;
export const WEB_PORT_WALK_END = 3100;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * True when Next.js responds on the URL without rendering the app (HEAD only).
 * Full GET would run RSC and hammer project APIs during hub Run.
 */
const isNextWebUrlReady = (url: string, ownerDir?: string): boolean => {
  try {
    const parsed = new URL(url);
    const port = Number(parsed.port) || 80;
    return isNextDevServerOnPort(port, ownerDir);
  } catch {
    return false;
  }
};

/**
 * True when this project's API process is listening on the port (see isApiProcessListening).
 * When `ownerDir` is set, ignore another project's process on the same port.
 */
export const isApiRunning = (apiPort: number, ownerDir?: string): boolean =>
  isApiProcessListening(apiPort, ownerDir);

/** Gap between HTTP health calls while waiting for a freshly started API. */
export const API_HEALTH_RETRY_MS = 15_000;

/**
 * Wait for a freshly started API (up to maxSeconds): poll the port every second (process check),
 * then confirm with an HTTP health call — at most one every 15 s, each allowed 10 s.
 */
export const waitForExpressHealth = async (
  apiPort: number,
  healthPath: string,
  maxSeconds = 180,
  ownerDir?: string,
): Promise<boolean> => {
  const deadline = Date.now() + maxSeconds * 1000;
  let lastHealthCallAt = 0;
  while (Date.now() < deadline) {
    if (!isApiRunning(apiPort, ownerDir)) {
      await sleep(1000);
      continue;
    }
    const sinceLastCall = Date.now() - lastHealthCallAt;
    if (sinceLastCall < API_HEALTH_RETRY_MS) {
      await sleep(Math.min(API_HEALTH_RETRY_MS - sinceLastCall, Math.max(deadline - Date.now(), 0)));
      continue;
    }
    lastHealthCallAt = Date.now();
    if (await fetchApiHealth(apiPort, healthPath)) {
      return true;
    }
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
 * Resolve API port for Run: reuse this project's running API on preferred, else first free slot.
 * `avoid` keeps the API off a port the web walk is about to use.
 */
export const resolveApiPortForRun = (
  preferredApiPort: number,
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
    isApiRunning(preferredApiPort, ownerDir)
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
    if (isNextWebUrlReady(url, ownerDir)) {
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
    if (url && isNextWebUrlReady(url, ownerDir)) {
      return url;
    }
    await sleep(1000);
  }
  return undefined;
};
