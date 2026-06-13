import path from 'path';

import { mergeStudioConfig, readLocalConfig, readRegistry } from '../../utils/studios';
import { openInChrome, resolveStudioWebUrl } from '../../utils/launcher';

/**
 * Open Chrome for a studio using saved or detected web URL (no server start).
 */
export const processOpenChrome = (studioId: string): boolean => {
  const hubRoot = path.resolve(__dirname, '../../..');
  const registry = readRegistry(hubRoot);
  const localConfig = readLocalConfig(hubRoot);
  const entry = registry.find((s) => s.id === studioId);
  if (!entry || entry.apiOnly) {
    return false;
  }

  const merged = mergeStudioConfig(entry, localConfig);
  if (!merged?.webDir) {
    return false;
  }

  const webUrl = resolveStudioWebUrl(studioId, merged.webPortStart);
  if (!webUrl) {
    return false;
  }

  openInChrome(webUrl);
  return true;
};
