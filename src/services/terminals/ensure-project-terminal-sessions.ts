import type { ProjectLocalEntry, ProjectRegistryEntry } from '../projects/types';
import {
  getStorageExpressRegistryRepo,
  mergeProjectConfig,
  projectHasExpressRepo,
  projectHasNextjsRepo,
  projectHasStorageExpressRepo,
} from '../../utils/projects';
import {
  findOwnedNextWebUrl,
  isExpressHealthy,
} from '../../utils/projects/wait-for-project-ready';
import { hasProjectRole, isRoleSuppressed } from './session-registry';
import { buildRunningStatusPtyCommand, spawnProjectPty } from './spawn-project-pty';
import type { TerminalSessionInfo } from './types';

type EnsureProjectTerminalSessionsInput = {
  entry: ProjectRegistryEntry;
  local: ProjectLocalEntry;
  localConfig: Parameters<typeof mergeProjectConfig>[1];
  /** When true, attach orphan status tabs for ports started outside this hub session. */
  orphan?: boolean;
};

/**
 * Attach read-only status PTYs for project ports that are already listening.
 */
export const ensureProjectTerminalSessions = (
  input: EnsureProjectTerminalSessionsInput,
): TerminalSessionInfo[] => {
  const merged = mergeProjectConfig(input.entry, input.localConfig);
  if (!merged) {
    return [];
  }

  const spawned: TerminalSessionInfo[] = [];
  const orphan = input.orphan ?? false;

  if (projectHasExpressRepo(input.entry) && merged.expressDir) {
    const expressHealthy = isExpressHealthy(
      merged.apiPort,
      merged.healthPath,
      merged.expressDir,
    );
    if (
      expressHealthy &&
      !hasProjectRole(input.entry.id, 'express') &&
      !isRoleSuppressed(input.entry.id, 'express')
    ) {
      spawned.push(
        spawnProjectPty({
          projectId: input.entry.id,
          role: 'express',
          label: `${input.entry.name} API`,
          command: buildRunningStatusPtyCommand(`${input.entry.name} API`, merged.apiPort, orphan),
          cwd: merged.expressDir,
          port: merged.apiPort,
          kind: 'status',
        }),
      );
    }
  }

  if (projectHasStorageExpressRepo(input.entry) && merged.storageExpressDir) {
    const storageRepo = getStorageExpressRegistryRepo(input.entry);
    const storagePort = storageRepo?.defaultApiPort ?? 3010;
    const storageHealthPath = storageRepo?.healthPath ?? '/api/storage/health';
    const storageHealthy = isExpressHealthy(
      storagePort,
      storageHealthPath,
      merged.storageExpressDir,
    );
    if (
      storageHealthy &&
      !hasProjectRole(input.entry.id, 'storage-express') &&
      !isRoleSuppressed(input.entry.id, 'storage-express')
    ) {
      spawned.push(
        spawnProjectPty({
          projectId: input.entry.id,
          role: 'storage-express',
          label: `${input.entry.name} Storage`,
          command: buildRunningStatusPtyCommand(
            `${input.entry.name} Storage`,
            storagePort,
            orphan,
          ),
          cwd: merged.storageExpressDir,
          port: storagePort,
          kind: 'status',
        }),
      );
    }
  }

  if (projectHasNextjsRepo(input.entry) && merged.webDir) {
    const webUrl = findOwnedNextWebUrl(merged.webDir);
    if (webUrl && !hasProjectRole(input.entry.id, 'web') && !isRoleSuppressed(input.entry.id, 'web')) {
      const port = Number(new URL(webUrl).port) || merged.webPortStart;
      spawned.push(
        spawnProjectPty({
          projectId: input.entry.id,
          role: 'web',
          label: `${input.entry.name} Web`,
          command: buildRunningStatusPtyCommand(`${input.entry.name} Web`, port, orphan),
          cwd: merged.webDir,
          port,
          kind: 'status',
        }),
      );
    }
  }

  return spawned;
};
