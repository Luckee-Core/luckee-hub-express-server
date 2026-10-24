import type {
  HubLocalConfig,
  MergedProjectConfig,
  ProjectRegistryEntry,
} from '../../services/projects/types';
import { readEnvKey } from '../supabase-config/upsert-env-keys';
import { getExpressRegistryRepo, getNextjsRegistryRepo } from './get-registry-repo';
import { resolveProjectWorkspaceFile } from './resolve-project-workspace-file';

const readExpressPortFromEnv = (expressDir?: string): number => {
  if (!expressDir) {
    return 0;
  }
  const raw = readEnvKey(expressDir, 'PORT');
  if (!raw) {
    return 0;
  }
  const port = Number(raw);
  if (!Number.isFinite(port) || port <= 0 || port >= 65536) {
    return 0;
  }
  return port;
};

/**
 * Merge registry entry with local project override and hub defaults.
 */
export const mergeProjectConfig = (
  registry: ProjectRegistryEntry,
  localConfig: HubLocalConfig,
): MergedProjectConfig | null => {
  const local = localConfig.projects?.[registry.id];
  if (!local) {
    return null;
  }

  const expressRepo = getExpressRegistryRepo(registry);
  const nextjsRepo = getNextjsRegistryRepo(registry);
  const registryApiPort = expressRepo?.defaultApiPort ?? 0;
  const envApiPort = readExpressPortFromEnv(local.expressDir);

  return {
    id: registry.id,
    registry,
    local,
    webDir: local.webDir,
    expressDir: local.expressDir,
    storageExpressDir: local.storageExpressDir,
    workspaceFile: resolveProjectWorkspaceFile(local),
    apiPort: envApiPort > 0 ? envApiPort : registryApiPort,
    webPortStart: local.webPortStart ?? nextjsRepo?.defaultWebPortStart ?? 3000,
    healthPath: expressRepo?.healthPath ?? '/api/health',
    nvmSh: localConfig.nvmSh ?? `${process.env.HOME}/.nvm/nvm.sh`,
    cursorBin:
      localConfig.cursorBin ??
      '/Applications/Cursor.app/Contents/Resources/app/bin/cursor',
    cursorOpenFlags: localConfig.cursorOpenFlags ?? '--classic --new-window',
  };
};
