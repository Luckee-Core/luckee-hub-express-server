import path from 'path';

import { mergeProjectConfig, projectHasNextjsRepo, readLocalConfig, readRegistry } from '../../utils/projects';
import { openInChrome, resolveProjectWebUrl } from '../../utils/launcher';

/**
 * Open Chrome for a project's web URL (no server start).
 */
export const processOpenChrome = (projectId: string): boolean => {
  const hubRoot = path.resolve(__dirname, '../../..');
  const registry = readRegistry(hubRoot);
  const localConfig = readLocalConfig(hubRoot);
  const entry = registry.find((s) => s.id === projectId);
  if (!entry || !projectHasNextjsRepo(entry)) {
    return false;
  }

  const merged = mergeProjectConfig(entry, localConfig);
  if (!merged) {
    return false;
  }

  const webUrl = resolveProjectWebUrl(projectId, merged.webPortStart);
  if (!webUrl) {
    return false;
  }

  openInChrome(webUrl);
  return true;
};
