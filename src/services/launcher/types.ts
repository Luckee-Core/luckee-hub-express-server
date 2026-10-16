import type { TerminalRole } from '../terminals/types';

export type LauncherJobStatus = 'running' | 'completed' | 'failed';

export type SetupJobStepStatus = 'pending' | 'running' | 'done' | 'skipped' | 'failed';

export type SetupJobStep = {
  id: string;
  label: string;
  status: SetupJobStepStatus;
  message?: string;
};

export type LauncherJobSession = {
  sessionId: string;
  projectId: string;
  role: TerminalRole;
  label: string;
};

export type LauncherJob = {
  jobId: string;
  projectId: string;
  status: LauncherJobStatus;
  message?: string;
  webUrl?: string;
  sessions?: LauncherJobSession[];
  steps?: SetupJobStep[];
  updatedAt: string;
};
