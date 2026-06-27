import type {
  HubLocalConfig,
  MergedProjectConfig,
  ProjectRegistryEntry,
} from '../../services/projects/types';
import { getExpressRegistryRepo, getNextjsRegistryRepo } from './get-registry-repo';
import { resolveProjectWorkspaceFile } from './resolve-project-workspace-file';

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

  return {
    id: registry.id,
    registry,
    local,
    webDir: local.webDir,
    expressDir: local.expressDir,
    workspaceFile: resolveProjectWorkspaceFile(local),
    apiPort: expressRepo?.defaultApiPort ?? 0,
    webPortStart: local.webPortStart ?? nextjsRepo?.defaultWebPortStart ?? 3000,
    healthPath: expressRepo?.healthPath ?? '/api/health',
    nvmSh: localConfig.nvmSh ?? `${process.env.HOME}/.nvm/nvm.sh`,
    cursorBin:
      localConfig.cursorBin ??
      '/Applications/Cursor.app/Contents/Resources/app/bin/cursor',
    cursorOpenFlags: localConfig.cursorOpenFlags ?? '--classic --new-window',
  };
};
