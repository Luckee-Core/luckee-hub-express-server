import fs from 'fs';
import path from 'path';

import type { ProjectRegistryEntry } from '../../services/projects/types';
import type { LauncherJobFile, SetupJobStep } from '../../services/terminals/write-job-file';
import { writeJobFile } from '../../services/terminals/write-job-file';

const HUB_JOBS_DIR = '/tmp/luckee-hub/jobs';
const DEFAULT_STALE_MS = 2 * 60 * 1000;

const cloneStepId = (repoName: string): string => `clone-${repoName}`;
const installStepId = (repoName: string): string => `install-${repoName}`;

/**
 * Build ordered setup steps for clone + npm install per registry repo.
 */
export const buildSetupSteps = (registry: ProjectRegistryEntry): SetupJobStep[] => {
  const steps: SetupJobStep[] = [];

  for (const repo of registry.repos) {
    steps.push({
      id: cloneStepId(repo.repoName),
      label: `Clone ${repo.repoName}`,
      status: 'pending',
    });
  }

  for (const repo of registry.repos) {
    steps.push({
      id: installStepId(repo.repoName),
      label: `Install ${repo.repoName}`,
      status: 'pending',
    });
  }

  return steps;
};

const readJobFile = (jobId: string): LauncherJobFile | null => {
  const filePath = path.join(HUB_JOBS_DIR, `${jobId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as LauncherJobFile;
};

/**
 * Mark stale running setup jobs as failed so retries can start fresh.
 */
export const expireStaleSetupJobs = (
  projectId: string,
  maxAgeMs: number = DEFAULT_STALE_MS,
): void => {
  if (!fs.existsSync(HUB_JOBS_DIR)) {
    return;
  }

  const now = Date.now();

  for (const fileName of fs.readdirSync(HUB_JOBS_DIR)) {
    if (!fileName.startsWith(`setup-${projectId}-`) || !fileName.endsWith('.json')) {
      continue;
    }

    const filePath = path.join(HUB_JOBS_DIR, fileName);
    const job = JSON.parse(fs.readFileSync(filePath, 'utf8')) as LauncherJobFile;
    if (job.status !== 'running') {
      continue;
    }

    const updatedMs = Date.parse(job.updatedAt);
    if (Number.isNaN(updatedMs) || now - updatedMs <= maxAgeMs) {
      continue;
    }

    const failedSteps = job.steps?.map((step) =>
      step.status === 'running' || step.status === 'pending'
        ? { ...step, status: 'failed' as const, message: 'Setup interrupted' }
        : step,
    );

    writeJobFile({
      ...job,
      status: 'failed',
      message: 'Setup interrupted',
      steps: failedSteps,
      updatedAt: new Date().toISOString(),
    });
  }
};

/**
 * Return a fresh running setup job id for the project, if any.
 */
export const getActiveSetupJobId = (
  projectId: string,
  maxAgeMs: number = DEFAULT_STALE_MS,
): string | null => {
  if (!fs.existsSync(HUB_JOBS_DIR)) {
    return null;
  }

  const now = Date.now();
  let activeJobId: string | null = null;
  let activeUpdatedMs = 0;

  for (const fileName of fs.readdirSync(HUB_JOBS_DIR)) {
    if (!fileName.startsWith(`setup-${projectId}-`) || !fileName.endsWith('.json')) {
      continue;
    }

    const job = JSON.parse(
      fs.readFileSync(path.join(HUB_JOBS_DIR, fileName), 'utf8'),
    ) as LauncherJobFile;

    if (job.status !== 'running' || !job.jobId) {
      continue;
    }

    const updatedMs = Date.parse(job.updatedAt);
    if (Number.isNaN(updatedMs) || now - updatedMs > maxAgeMs) {
      continue;
    }

    if (updatedMs >= activeUpdatedMs) {
      activeJobId = job.jobId;
      activeUpdatedMs = updatedMs;
    }
  }

  return activeJobId;
};

type WriteSetupJobStepPatch = {
  status?: SetupJobStep['status'];
  message?: string;
};

/**
 * Update one setup step and persist the job file.
 */
export const writeSetupJobStep = (
  jobId: string,
  stepId: string,
  patch: WriteSetupJobStepPatch,
  topLevelMessage?: string,
): LauncherJobFile | null => {
  const job = readJobFile(jobId);
  if (!job || !job.steps) {
    return null;
  }

  const steps = job.steps.map((step) =>
    step.id === stepId
      ? {
          ...step,
          ...patch,
        }
      : step,
  );

  const nextJob: LauncherJobFile = {
    ...job,
    steps,
    message: topLevelMessage ?? job.message,
    updatedAt: new Date().toISOString(),
  };

  writeJobFile(nextJob);
  return nextJob;
};

export const getSetupCloneStepId = cloneStepId;
export const getSetupInstallStepId = installStepId;
