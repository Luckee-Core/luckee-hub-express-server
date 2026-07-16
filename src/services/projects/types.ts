import type { LocalDatabaseConfig } from '../local-database/types';

export type { LocalDatabaseConfig, LocalDatabaseCleanupResult, LocalDatabaseProbe, LocalDatabaseSetupResult, LocalDatabaseStepResult } from '../local-database/types';

export type HookStatus =
  | 'catalog'
  | 'disabled'
  | 'missing'
  | 'cloned'
  | 'configured'
  | 'api_running'
  | 'web_running'
  | 'ready';

export type ProjectHookCheck = {
  id: string;
  label: string;
  ok: boolean;
};

export type ProjectRegistryRepoType = 'express' | 'nextjs';

export type ProjectRegistryRepoEntry = {
  repoType: ProjectRegistryRepoType;
  repoName: string;
  defaultApiPort?: number;
  defaultWebPortStart?: number;
  healthPath?: string;
};

export type ProjectRegistryEntry = {
  id: string;
  name: string;
  description: string;
  repos: ProjectRegistryRepoEntry[];
  localDatabase?: LocalDatabaseConfig;
};

export type HubProjectRepo = {
  projectId: string;
  repoType: ProjectRegistryRepoType;
  repoName: string;
  repoUrl?: string;
  localDir?: string;
  dirExists?: boolean;
  depsInstalled?: boolean;
  defaultApiPort?: number;
  defaultWebPortStart?: number;
  healthPath?: string;
};

export type ProjectLocalEntry = {
  enabled?: boolean;
  webDir?: string;
  expressDir?: string;
  workspaceFile?: string;
  /** Override registry defaultWebPortStart (e.g. lead-studio → 3033). */
  webPortStart?: number;
};

export type HubLocalConfig = {
  /** Parent directory for the required `luckee/` folder (e.g. `/Users/you/github`). */
  luckeeParent?: string;
  /** @deprecated Use luckeeParent. Kept as alias for existing configs. */
  workspaceParent?: string;
  nvmSh?: string;
  cursorBin?: string;
  cursorOpenFlags?: string;
  /** Override default `Luckee-Core` when repos live under another org. */
  githubOrg?: string;
  projects?: Record<string, ProjectLocalEntry>;
};

export type HubProject = {
  id: string;
  name: string;
  description: string;
  hookStatus: HookStatus;
  enabled: boolean;
  apiPort: number;
  webUrl?: string;
  paths?: {
    workspaceFile?: string;
  };
  localDatabaseSupported: boolean;
  postgresActiveConsumer?: boolean;
};

export type ListProjectsData = {
  projects: HubProject[];
  repos: HubProjectRepo[];
};

export type MergedProjectConfig = {
  id: string;
  registry: ProjectRegistryEntry;
  local?: ProjectLocalEntry;
  webDir?: string;
  expressDir?: string;
  workspaceFile?: string;
  apiPort: number;
  webPortStart: number;
  healthPath: string;
  nvmSh: string;
  cursorBin: string;
  cursorOpenFlags: string;
};
