import { spawnLauncherScript } from './spawn-launcher-script';

/**
 * Open Chrome for a studio using saved or detected web URL (no server start).
 */
export const processOpenChrome = (studioId: string): boolean => {
  const jobId = spawnLauncherScript({
    studioId,
    startServers: false,
    openWorkspace: false,
    openChrome: true,
  });
  return !!jobId;
};
