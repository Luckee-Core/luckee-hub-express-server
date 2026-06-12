import { spawnLauncherScript } from './spawn-launcher-script';

/**
 * Open Cursor workspace for a studio (no server start).
 */
export const processOpenCursor = (studioId: string): boolean => {
  const jobId = spawnLauncherScript({
    studioId,
    startServers: false,
    openWorkspace: true,
    openChrome: false,
  });
  return !!jobId;
};
