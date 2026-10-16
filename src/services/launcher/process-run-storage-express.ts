import {
  apiDepsInstalled,
  getStorageExpressRegistryRepo,
  mergeProjectConfig,
  projectHasStorageExpressRepo,
  readLocalConfig,
  readRegistry,
} from '../../utils/projects';
import { getHubRoot } from '../../utils/projects/get-hub-root';
import {
  buildStorageExpressPtyCommand,
  spawnProjectPty,
} from '../terminals/spawn-project-pty';
import {
  clearSuppressedStorageExpressRole,
  hasProjectRole,
} from '../terminals/session-registry';
import type { TerminalSessionInfo } from '../terminals/types';

export type RunStorageExpressResult = {
  sessions: TerminalSessionInfo[];
};

/**
 * Start Storage Express dev server in an embedded terminal (detail action only).
 */
export const processRunStorageExpress = (
  projectId: string,
): RunStorageExpressResult | { error: string; status: 400 | 500 } => {
  console.log('🚀 [launcher.processRunStorageExpress] Starting storage', { projectId });

  const hubRoot = getHubRoot();
  const registry = readRegistry(hubRoot);
  const localConfig = readLocalConfig(hubRoot);
  const entry = registry.find((project) => project.id === projectId);
  if (!entry || !projectHasStorageExpressRepo(entry)) {
    return { error: 'Project has no Storage Express repo', status: 400 };
  }

  const merged = mergeProjectConfig(entry, localConfig);
  if (!merged?.storageExpressDir) {
    return { error: 'Storage Express path not configured — run Setup first', status: 400 };
  }

  if (!apiDepsInstalled(merged.storageExpressDir)) {
    return { error: 'Storage Express dependencies not installed', status: 400 };
  }

  if (hasProjectRole(projectId, 'storage-express')) {
    console.log('✅ [launcher.processRunStorageExpress] Storage session already open', {
      projectId,
    });
    return { sessions: [] };
  }

  const storageRepo = getStorageExpressRegistryRepo(entry);
  const storagePort = storageRepo?.defaultApiPort ?? 3010;

  clearSuppressedStorageExpressRole(projectId);

  const session = spawnProjectPty({
    projectId,
    role: 'storage-express',
    label: `${entry.name} Storage`,
    command: buildStorageExpressPtyCommand(merged, storagePort),
    cwd: merged.storageExpressDir,
    port: storagePort,
    kind: 'dev',
  });

  console.log('✅ [launcher.processRunStorageExpress] Storage PTY spawned', {
    projectId,
    sessionId: session.sessionId,
  });

  return { sessions: [session] };
};
