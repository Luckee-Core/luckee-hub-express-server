import fs from 'fs';
import path from 'path';

import type { MergedProjectConfig } from '../../services/projects/types';
import { isExpressHealthOk, portListening } from './port-probes';
import {
  findFirstFreePort,
  findOwnedNextPort,
  isExpressHealthy,
  resolveApiPortForRun,
  WEB_PORT_WALK_END,
  WEB_PORT_WALK_START,
} from './wait-for-project-ready';

const HUB_TMP = '/tmp/luckee-hub';

export type ResolvedProjectPorts = {
  apiPort: number;
  webPort?: number;
  webPortStart: number;
  apiUrl: string;
  webUrl?: string;
  updatedAt: string;
};

const portsFilePath = (projectId: string): string =>
  path.join(HUB_TMP, `${projectId}-ports.json`);

/**
 * Read last resolved ports for a project (from hub Run), if present.
 */
export const readResolvedProjectPorts = (projectId: string): ResolvedProjectPorts | null => {
  const filePath = portsFilePath(projectId);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as ResolvedProjectPorts;
  } catch {
    return null;
  }
};

/**
 * Persist resolved ports after hub Run for probes and Open Chrome.
 */
export const writeResolvedProjectPorts = (
  projectId: string,
  ports: Omit<ResolvedProjectPorts, 'updatedAt'>,
): void => {
  fs.mkdirSync(HUB_TMP, { recursive: true });
  const payload: ResolvedProjectPorts = {
    ...ports,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(portsFilePath(projectId), `${JSON.stringify(payload, null, 2)}\n`);
};

/**
 * Preferred API port for live probes — resolved file wins over registry default.
 */
export const getPreferredApiPort = (
  projectId: string,
  registryApiPort: number,
): number => {
  const resolved = readResolvedProjectPorts(projectId);
  if (resolved?.apiPort && resolved.apiPort > 0) {
    return resolved.apiPort;
  }
  return registryApiPort;
};

/**
 * Scan API ports for a healthy Express instance (resolved preferred + scan range).
 */
export const findExpressApiPort = (
  projectId: string,
  registryApiPort: number,
  healthPath: string,
  scanMax = 10,
  ownerDir?: string,
): number | undefined => {
  const start = getPreferredApiPort(projectId, registryApiPort);
  if (start <= 0) {
    return undefined;
  }
  for (let port = start; port < start + scanMax; port += 1) {
    if (isExpressHealthOk(port, healthPath, ownerDir)) {
      return port;
    }
  }
  return undefined;
};

/**
 * Resolve ports before hub Run.
 * API stays on the catalog port when it is free or already this project's server.
 * Web takes the first free port from 3000 (3000 taken → 3001 → …), never the API port.
 */
export const resolveProjectPortsForRun = (
  merged: MergedProjectConfig,
): { apiPort: number; webPortStart: number; apiUrl: string } => {
  const walkLength = WEB_PORT_WALK_END - WEB_PORT_WALK_START + 1;
  const existingWeb = merged.webDir ? findOwnedNextPort(merged.webDir) : undefined;

  const catalogHeldByThisProject =
    merged.apiPort > 0 &&
    isExpressHealthy(merged.apiPort, merged.healthPath, merged.expressDir);
  const catalogFree =
    merged.apiPort > 0 &&
    !portListening(merged.apiPort) &&
    existingWeb !== merged.apiPort;

  let apiPort = catalogHeldByThisProject || catalogFree ? merged.apiPort : 0;

  const webPortStart =
    existingWeb ??
    findFirstFreePort(WEB_PORT_WALK_START, walkLength, apiPort > 0 ? [apiPort] : []);

  if (apiPort <= 0) {
    const start = merged.apiPort > 0 ? merged.apiPort : 3010;
    apiPort = resolveApiPortForRun(
      start,
      merged.healthPath,
      20,
      merged.expressDir,
      [webPortStart],
    );
  }

  return {
    apiPort,
    webPortStart,
    apiUrl: `http://127.0.0.1:${apiPort}`,
  };
};

/**
 * Build merged config with resolved API port for PTY spawn commands.
 */
export const withResolvedApiPort = (
  merged: MergedProjectConfig,
  apiPort: number,
): MergedProjectConfig => ({
  ...merged,
  apiPort,
});
