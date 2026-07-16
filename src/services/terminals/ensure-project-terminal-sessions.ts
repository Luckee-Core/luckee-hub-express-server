import type { ProjectLocalEntry, ProjectRegistryEntry } from '../projects/types';
import {
  mergeProjectConfig,
  projectHasExpressRepo,
  projectHasNextjsRepo,
} from '../../utils/projects';
import {
  findNextWebUrl,
  isExpressHealthy,
} from '../../utils/projects/wait-for-project-ready';
import { hasProjectRole } from './session-registry';
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
    const expressHealthy = isExpressHealthy(merged.apiPort, merged.healthPath);
    if (expressHealthy && !hasProjectRole(input.entry.id, 'express')) {
      spawned.push(
        spawnProjectPty({
          projectId: input.entry.id,
          role: 'express',
          label: `${input.entry.name} API`,
          command: buildRunningStatusPtyCommand(`${input.entry.name} API`, merged.apiPort, orphan),
          cwd: merged.expressDir,
          port: merged.apiPort,
        }),
      );
    }
  }

  if (projectHasNextjsRepo(input.entry) && merged.webDir) {
    const webUrl = findNextWebUrl(merged.webPortStart, 1);
    if (webUrl && !hasProjectRole(input.entry.id, 'web')) {
      const port = Number(new URL(webUrl).port) || merged.webPortStart;
      spawned.push(
        spawnProjectPty({
          projectId: input.entry.id,
          role: 'web',
          label: `${input.entry.name} Web`,
          command: buildRunningStatusPtyCommand(`${input.entry.name} Web`, port, orphan),
          cwd: merged.webDir,
          port,
        }),
      );
    }
  }

  return spawned;
};
