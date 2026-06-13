import path from 'path';

import { mergeStudioConfig, readLocalConfig, readRegistry } from '../../utils/studios';
import { openCursorWorkspace } from '../../utils/launcher';

/**
 * Open Cursor workspace for a studio (no server start).
 */
export const processOpenCursor = (studioId: string): boolean => {
  const hubRoot = path.resolve(__dirname, '../../..');
  const registry = readRegistry(hubRoot);
  const localConfig = readLocalConfig(hubRoot);
  const entry = registry.find((s) => s.id === studioId);
  if (!entry) {
    return false;
  }

  const merged = mergeStudioConfig(entry, localConfig);
  if (!merged?.workspaceFile) {
    return false;
  }

  return openCursorWorkspace(merged.workspaceFile, merged.cursorBin, merged.cursorOpenFlags);
};
