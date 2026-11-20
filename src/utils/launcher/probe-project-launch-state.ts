import type { MergedProjectConfig } from '../../services/projects/types';
import { readEnvKey } from '../supabase-config/upsert-env-keys';
import {
  getStorageExpressRegistryRepo,
  projectHasExpressRepo,
  projectHasStorageExpressRepo,
} from '../projects';
import { listListeningTcpPorts, portOwnedByDir } from '../projects/port-probes';
import { getPreferredApiPort } from '../projects/resolve-project-ports';
import { findOwnedNextWebUrl, isExpressHealthy } from '../projects/wait-for-project-ready';

const API_PORT_SCAN_START = 3000;
const API_PORT_SCAN_END = 3999;

/**
 * Port where this repo's API process is listening (cwd under `expressDir`), if any.
 * Ownership, not an HTTP health call: some APIs' health makes a gateway round trip that
 * exceeds the hub's 0.5 s probe timeout, and a false "down" would restart a running API.
 */
const findOwnedApiPort = (
  projectId: string,
  registryApiPort: number,
  expressDir: string,
): number | undefined => {
  const preferred = getPreferredApiPort(projectId, registryApiPort);
  const listening = listListeningTcpPorts();
  const candidates = [
    preferred,
    registryApiPort,
    ...listening
      .filter((port) => port >= API_PORT_SCAN_START && port <= API_PORT_SCAN_END)
      .sort((a, b) => a - b),
  ].filter((port, index, all) => port > 0 && all.indexOf(port) === index);
  return candidates.find((port) => listening.includes(port) && portOwnedByDir(port, expressDir));
};

export type ProjectLaunchState = {
  /** True when the project has no API repo or its API process is listening. */
  expressOk: boolean;
  apiPort?: number;
  /** Origin of this project's running Next.js dev server (any port in the 3000–3100 walk). */
  webUrl?: string;
  /** Storage must run locally: the project has a storage repo and its data plane is `direct`. */
  storageNeeded: boolean;
  storageOk: boolean;
};

/**
 * Probe what a launch link needs (ADR 035). Reads only — never starts anything.
 */
export const probeProjectLaunchState = (merged: MergedProjectConfig): ProjectLaunchState => {
  const entry = merged.registry;

  const hasExpress = projectHasExpressRepo(entry);
  const apiPort =
    hasExpress && merged.expressDir
      ? findOwnedApiPort(merged.id, merged.apiPort, merged.expressDir)
      : undefined;
  const expressOk = !hasExpress || apiPort !== undefined;

  const webUrl = merged.webDir ? findOwnedNextWebUrl(merged.webDir) : undefined;

  const dataPlaneValue =
    entry.dataPlane && merged.expressDir
      ? readEnvKey(merged.expressDir, entry.dataPlane.modeKey)
      : null;
  const storageNeeded =
    projectHasStorageExpressRepo(entry) && dataPlaneValue?.trim().toLowerCase() === 'direct';

  let storageOk = true;
  if (storageNeeded) {
    const storageRepo = getStorageExpressRegistryRepo(entry);
    const storagePort = storageRepo?.defaultApiPort ?? 0;
    storageOk =
      storagePort > 0 &&
      isExpressHealthy(
        storagePort,
        storageRepo?.healthPath ?? '/api/storage/health',
        merged.storageExpressDir,
      );
  }

  return { expressOk, apiPort, webUrl, storageNeeded, storageOk };
};
