import type { LocalDatabaseConfig } from '../local-database/types';

export type { LocalDatabaseConfig, LocalDatabaseProbe, LocalDatabaseSetupResult } from '../local-database/types';

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

export type ProjectRegistryEntry = {
  id: string;
  name: string;
  description: string;
  webRepo: string | null;
  apiRepo: string | null;
  defaultApiPort: number;
  defaultWebPortStart: number;
  healthPath: string;
  webOnly: boolean;
  apiOnly: boolean;
  localDatabase?: LocalDatabaseConfig;
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
  hookChecks: ProjectHookCheck[];
  enabled: boolean;
  apiOnly: boolean;
  webOnly: boolean;
  apiPort: number;
  webUrl?: string;
  apiRepoUrl?: string;
  webRepoUrl?: string;
  paths?: {
    webDir?: string;
    expressDir?: string;
    workspaceFile?: string;
  };
  localDatabaseSupported: boolean;
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
