import { fetchSchedulerWorkers } from '../../utils/local-scheduler/fetch-scheduler-workers';
import { mergeProjectConfig, readLocalConfig, readRegistry } from '../../utils/projects';
import { isExpressHealthy } from '../../utils/projects/wait-for-project-ready';
import { hasProjectRole, isRoleSuppressed } from './session-registry';
import { buildSchedulerWorkerLogPtyCommand, spawnProjectPty } from './spawn-project-pty';
import type { TerminalSessionInfo } from './types';

const LOCAL_SCHEDULER_PROJECT_ID = 'local-scheduler';
const FAILED_RECENT_MS = 5 * 60 * 1000;

const isFailedRecently = (updatedAt: string | null): boolean => {
  if (!updatedAt) {
    return false;
  }
  const updatedMs = Date.parse(updatedAt);
  if (!Number.isFinite(updatedMs)) {
    return false;
  }
  return Date.now() - updatedMs <= FAILED_RECENT_MS;
};

const shouldAttachWorkerLog = (worker: {
  phase: string;
  updatedAt: string | null;
}): boolean => {
  if (worker.phase === 'starting') {
    return true;
  }
  if (worker.phase === 'failed') {
    return isFailedRecently(worker.updatedAt);
  }
  return false;
};

/**
 * Opens tail -F PTYs on worker projects when local-scheduler reports an active spawn.
 */
export const ensureSchedulerWorkerLogSessions = async (
  hubRoot: string,
): Promise<TerminalSessionInfo[]> => {
  const registry = readRegistry(hubRoot);
  const localConfig = readLocalConfig(hubRoot);
  const schedulerEntry = registry.find((entry) => entry.id === LOCAL_SCHEDULER_PROJECT_ID);
  const schedulerLocal = localConfig.projects?.[LOCAL_SCHEDULER_PROJECT_ID];

  if (!schedulerEntry || !schedulerLocal || schedulerLocal.enabled === false) {
    return [];
  }

  const schedulerMerged = mergeProjectConfig(schedulerEntry, localConfig);
  if (!schedulerMerged?.expressDir) {
    return [];
  }

  const schedulerHealthy = isExpressHealthy(
    schedulerMerged.apiPort,
    schedulerMerged.healthPath,
    schedulerMerged.expressDir,
  );
  if (!schedulerHealthy) {
    return [];
  }

  const workers = await fetchSchedulerWorkers(schedulerMerged.apiPort);
  if (!workers) {
    return [];
  }

  const spawned: TerminalSessionInfo[] = [];

  for (const worker of workers) {
    if (!shouldAttachWorkerLog(worker)) {
      continue;
    }

    const workerEntry = registry.find((entry) => entry.id === worker.workerProjectId);
    const workerLocal = localConfig.projects?.[worker.workerProjectId];
    if (!workerEntry || !workerLocal || workerLocal.enabled === false) {
      continue;
    }

    if (
      hasProjectRole(worker.workerProjectId, 'scheduler-worker') ||
      isRoleSuppressed(worker.workerProjectId, 'scheduler-worker')
    ) {
      continue;
    }

    const workerMerged = mergeProjectConfig(workerEntry, localConfig);
    const cwd = workerMerged?.expressDir ?? worker.expressDir ?? hubRoot;

    spawned.push(
      spawnProjectPty({
        projectId: worker.workerProjectId,
        role: 'scheduler-worker',
        label: `${workerEntry.name} — scheduler spawn log`,
        command: buildSchedulerWorkerLogPtyCommand(worker.logPath),
        cwd,
        port: worker.port,
        kind: 'dev',
      }),
    );
  }

  return spawned;
};
