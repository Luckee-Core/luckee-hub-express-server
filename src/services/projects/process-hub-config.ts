import path from 'path';

import type { HubLocalConfig } from './types';
import {
  getHubRoot,
  readLocalConfig,
  resolveLuckeeParent,
  writeLocalConfig,
} from '../../utils/projects';
import { pickFolderMacos } from '../../utils/projects/pick-folder-macos';

export type HubConfigData = {
  luckeeParent?: string;
  githubOrg?: string;
};

/**
 * Read hub machine config exposed to the UI.
 */
export const processGetHubConfig = (): HubConfigData => {
  const hubRoot = getHubRoot();
  const localConfig = readLocalConfig(hubRoot);
  return {
    luckeeParent: resolveLuckeeParent(localConfig),
    githubOrg: localConfig.githubOrg,
  };
};

/**
 * Persist luckeeParent in hub.local.json.
 */
export const processPutHubConfig = (luckeeParent: string): { success: true } | { error: string } => {
  if (!luckeeParent.trim()) {
    return { error: 'luckeeParent is required' };
  }

  if (!path.isAbsolute(luckeeParent)) {
    return { error: 'luckeeParent must be an absolute path' };
  }

  const hubRoot = getHubRoot();
  const localConfig = readLocalConfig(hubRoot);
  const nextConfig: HubLocalConfig = {
    ...localConfig,
    luckeeParent,
  };

  writeLocalConfig(hubRoot, nextConfig);
  return { success: true };
};

/**
 * Open Finder folder picker and persist luckeeParent.
 */
export const processPickLuckeeParentFolder = ():
  | { luckeeParent: string }
  | { error: string; cancelled?: boolean } => {
  try {
    const picked = pickFolderMacos(
      'Choose where the luckee folder should live. Projects will be cloned into luckee/{project}/ inside this folder.',
    );
    if (!picked) {
      return { error: 'Folder selection is required', cancelled: true };
    }

    const saved = processPutHubConfig(picked);
    if ('error' in saved) {
      return { error: saved.error };
    }

    return { luckeeParent: picked };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to open folder picker';
    return { error: message };
  }
};
