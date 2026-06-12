import path from 'path';

import { processRunEmbedded } from '../terminals/process-run-embedded';
import type { TerminalSessionInfo } from '../terminals/types';
import { readLocalConfig } from '../../utils/studios';
import { spawnLauncherScript } from './spawn-launcher-script';

export type RunStudioResult = {
  jobId: string;
  sessions?: TerminalSessionInfo[];
};

/**
 * Start studio dev servers — embedded PTYs by default, external Terminal when configured.
 */
export const processRunStudio = (studioId: string): RunStudioResult | null => {
  const hubRoot = path.resolve(__dirname, '../../..');
  const localConfig = readLocalConfig(hubRoot);

  if (localConfig.useExternalTerminal) {
    const jobId = spawnLauncherScript({
      studioId,
      startServers: true,
      openWorkspace: false,
      openChrome: true,
    });
    if (!jobId) {
      return null;
    }
    return { jobId };
  }

  return processRunEmbedded(studioId);
};
