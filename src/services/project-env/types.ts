import type { HubProjectRepoRole } from '../projects/types';

export type ProjectEnvKey = {
  key: string;
  secret: boolean;
  required: boolean;
  optional: boolean;
  present: boolean;
  placeholder?: string;
  value?: string;
};

export type ProjectEnvSection = {
  id: string;
  title: string;
  description: string;
  keys: ProjectEnvKey[];
};

export type ProjectEnvProbe = {
  role: HubProjectRepoRole;
  repoName: string;
  cloned: boolean;
  envPath?: string;
  sections: ProjectEnvSection[];
  message?: string;
};

export type ProjectEnvSaveResult = {
  success: boolean;
  message: string;
  probe: ProjectEnvProbe;
};

export type DataPlaneProbe = {
  supported: boolean;
  modeKey?: string;
  value?: string | null;
  activeOptionId?: string | null;
  message?: string;
};

export type DataPlaneSetResult = {
  success: boolean;
  message: string;
  probe: DataPlaneProbe;
};
