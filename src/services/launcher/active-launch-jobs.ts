import { processGetJob } from './process-get-job';

/** In-flight launch jobs per project, so a second click reuses the first start (ADR 035). */
const activeLaunchJobs = new Map<string, string>();

/**
 * The project's launch job that is still running, if any. Finished or missing jobs are dropped.
 */
export const getRunningLaunchJobId = (projectId: string): string | undefined => {
  const jobId = activeLaunchJobs.get(projectId);
  if (!jobId) {
    return undefined;
  }
  const job = processGetJob(jobId);
  if (job?.status === 'running') {
    return jobId;
  }
  activeLaunchJobs.delete(projectId);
  return undefined;
};

export const setRunningLaunchJobId = (projectId: string, jobId: string): void => {
  activeLaunchJobs.set(projectId, jobId);
};
