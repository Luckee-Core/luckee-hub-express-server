export type HookStatus =
  | 'catalog'
  | 'disabled'
  | 'missing'
  | 'cloned'
  | 'configured'
  | 'api_running'
  | 'web_running'
  | 'ready';

export type StudioRegistryEntry = {
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
};

export type StudioLocalEntry = {
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
  useExternalTerminal?: boolean;
  studios?: Record<string, StudioLocalEntry>;
};

export type StudioCard = {
  id: string;
  name: string;
  description: string;
  hookStatus: HookStatus;
  enabled: boolean;
  apiOnly: boolean;
  webOnly: boolean;
  apiPort: number;
  webUrl?: string;
  paths?: {
    webDir?: string;
    expressDir?: string;
    workspaceFile?: string;
  };
};

export type MergedStudioConfig = {
  id: string;
  registry: StudioRegistryEntry;
  local?: StudioLocalEntry;
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
