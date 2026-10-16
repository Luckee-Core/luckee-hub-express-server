export type SchedulerWorkerPhase = 'idle' | 'starting' | 'healthy' | 'failed';

export type SchedulerWorkerStatus = {
  workerProjectId: string;
  port: number;
  expressDir: string | null;
  logPath: string;
  pid: number | null;
  phase: SchedulerWorkerPhase;
  startedAt: string | null;
  updatedAt: string | null;
  lastHealthAt: string | null;
  taskId: string | null;
  healthy: boolean;
};

const SCHEDULER_FETCH_TIMEOUT_MS = 2_500;

/**
 * Fetches worker runtime rows from local-scheduler Express (127.0.0.1 only).
 */
export const fetchSchedulerWorkers = async (
  apiPort: number,
): Promise<SchedulerWorkerStatus[] | null> => {
  const url = `http://127.0.0.1:${apiPort}/api/workers`;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(SCHEDULER_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as { success?: boolean; data?: SchedulerWorkerStatus[] };
    if (!body.success || !Array.isArray(body.data)) {
      return null;
    }
    return body.data;
  } catch {
    return null;
  }
};
