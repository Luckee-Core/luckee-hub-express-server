import path from 'path';

import { mergeProjectConfig, readLocalConfig, readRegistry } from '../../utils/projects';
import { openCursorWorkspace } from '../../utils/launcher';

/**
 * Open Cursor workspace for a project (no server start).
 */
export const processOpenCursor = (projectId: string): boolean => {
  const hubRoot = path.resolve(__dirname, '../../..');
  const registry = readRegistry(hubRoot);
  const localConfig = readLocalConfig(hubRoot);
  const entry = registry.find((s) => s.id === projectId);
  if (!entry) {
    return false;
  }

  const merged = mergeProjectConfig(entry, localConfig);
  if (!merged?.workspaceFile) {
    return false;
  }

  return openCursorWorkspace(merged.workspaceFile, merged.cursorBin, merged.cursorOpenFlags);
};
