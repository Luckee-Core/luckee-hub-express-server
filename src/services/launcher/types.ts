export type LauncherJobStatus = 'running' | 'completed' | 'failed';

export type LauncherJobSession = {
  sessionId: string;
  projectId: string;
  role: 'express' | 'web';
  label: string;
};

export type LauncherJob = {
  jobId: string;
  projectId: string;
  status: LauncherJobStatus;
  message?: string;
  webUrl?: string;
  sessions?: LauncherJobSession[];
  updatedAt: string;
};
