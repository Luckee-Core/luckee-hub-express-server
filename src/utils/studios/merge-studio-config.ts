import type {
  HubLocalConfig,
  MergedStudioConfig,
  StudioRegistryEntry,
} from '../../services/studios/types';

/**
 * Merge registry entry with local studio override and hub defaults.
 */
export const mergeStudioConfig = (
  registry: StudioRegistryEntry,
  localConfig: HubLocalConfig,
): MergedStudioConfig | null => {
  const local = localConfig.studios?.[registry.id];
  if (!local) {
    return null;
  }

  return {
    id: registry.id,
    registry,
    local,
    webDir: local.webDir,
    expressDir: local.expressDir,
    workspaceFile: local.workspaceFile,
    apiPort: registry.defaultApiPort,
    webPortStart: local.webPortStart ?? registry.defaultWebPortStart,
    healthPath: registry.healthPath,
    nvmSh: localConfig.nvmSh ?? `${process.env.HOME}/.nvm/nvm.sh`,
    cursorBin:
      localConfig.cursorBin ??
      '/Applications/Cursor.app/Contents/Resources/app/bin/cursor',
    cursorOpenFlags: localConfig.cursorOpenFlags ?? '--classic --reuse-window',
  };
};
