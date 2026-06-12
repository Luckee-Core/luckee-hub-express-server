export type LauncherJobStatus = 'running' | 'completed' | 'failed';

export type LauncherJobSession = {
  sessionId: string;
  studioId: string;
  role: 'express' | 'web';
  label: string;
};

export type LauncherJob = {
  jobId: string;
  studioId: string;
  status: LauncherJobStatus;
  message?: string;
  webUrl?: string;
  sessions?: LauncherJobSession[];
  updatedAt: string;
};

export type SpawnLauncherOptions = {
  studioId: string;
  startServers: boolean;
  openWorkspace: boolean;
  openChrome: boolean;
  jobId?: string;
};
