import type { LocalDatabaseConfig } from '../local-database/types';
import type { SupabaseConfig } from '../supabase-config/types';

export type { LocalDatabaseConfig, LocalDatabaseCleanupResult, LocalDatabaseProbe, LocalDatabaseSetupResult, LocalDatabaseStepResult } from '../local-database/types';
export type {
  SupabaseConfig,
  SupabaseProbe,
  SupabaseConfigSaveInput,
  SupabaseConfigSaveResult,
} from '../supabase-config/types';
export type { ProjectEnvProbe, ProjectEnvSection, ProjectEnvKey, DataPlaneProbe } from '../project-env/types';

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

export type ProjectRegistryRepoType = 'express' | 'nextjs' | 'storage-express';

export type HubProjectRepoRole =
  | 'web'
  | 'express'
  | 'storage'
  | 'console'
  | 'dispatcher-web'
  | 'dispatcher'
  | 'mobile';

export type DataPlaneOption = {
  id: string;
  label: string;
  value: string;
  keys: string[];
  usesLocalDatabase?: boolean;
};

export type DataPlaneConfig = {
  modeKey: string;
  options: DataPlaneOption[];
};

export type ProjectRegistryRepoEntry = {
  repoType: ProjectRegistryRepoType;
  repoName: string;
  role: HubProjectRepoRole;
  defaultApiPort?: number;
  defaultWebPortStart?: number;
  healthPath?: string;
};

export type ExpressEnvRegistryConfig = {
  requiredKeys?: string[];
};

export type ProjectRegistryEntry = {
  id: string;
  name: string;
  description: string;
  /** Override hub `githubOrg` / default `Luckee-Core` for this project's repos. */
  githubOrg?: string;
  repos: ProjectRegistryRepoEntry[];
  /** Path opened in Chrome after Run (e.g. `/dashboard`). Origin `/` when omitted. */
  webOpenPath?: string;
  localDatabase?: LocalDatabaseConfig;
  supabase?: SupabaseConfig;
  expressEnv?: ExpressEnvRegistryConfig;
  dataPlane?: DataPlaneConfig;
};

export type HubProjectRepo = {
  projectId: string;
  repoType: ProjectRegistryRepoType;
  role: HubProjectRepoRole;
  repoName: string;
  repoUrl?: string;
  localDir?: string;
  dirExists?: boolean;
  depsInstalled?: boolean;
  /** Set for the API repo after filesystem detection. */
  apiRuntime?: 'node' | 'python';
  defaultApiPort?: number;
  defaultWebPortStart?: number;
  healthPath?: string;
};

export type ProjectLocalEntry = {
  enabled?: boolean;
  webDir?: string;
  expressDir?: string;
  storageExpressDir?: string;
  dispatcherDir?: string;
  repoDirs?: Record<string, string>;
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
  supabaseSupported: boolean;
  dataPlane?: DataPlaneConfig;
  postgresActiveConsumer?: boolean;
  storageExpressSupported: boolean;
  storagePort: number;
  storageRunning?: boolean;
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
  storageExpressDir?: string;
  dispatcherDir?: string;
  workspaceFile?: string;
  apiPort: number;
  webPortStart: number;
  healthPath: string;
  nvmSh: string;
  cursorBin: string;
  cursorOpenFlags: string;
};
