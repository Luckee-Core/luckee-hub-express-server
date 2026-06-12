import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

import { mergeStudioConfig, readLocalConfig, readRegistry } from '../../utils/studios';
import type { SpawnLauncherOptions } from './types';

const HUB_TMP = '/tmp/luckee-hub';

/**
 * Build env vars and spawn detached run-studio.sh for a studio.
 */
export const spawnLauncherScript = (options: SpawnLauncherOptions): string | null => {
  const hubRoot = path.resolve(__dirname, '../../..');
  const registry = readRegistry(hubRoot);
  const localConfig = readLocalConfig(hubRoot);
  const entry = registry.find((s) => s.id === options.studioId);
  if (!entry) {
    return null;
  }

  const merged = mergeStudioConfig(entry, localConfig);
  if (!merged) {
    return null;
  }

  const jobId = options.jobId ?? `${options.studioId}-${Date.now()}`;
  const jobFile = `${HUB_TMP}/jobs/${jobId}.json`;

  fs.mkdirSync(`${HUB_TMP}/jobs`, { recursive: true });
  fs.writeFileSync(
    jobFile,
    JSON.stringify({
      jobId,
      studioId: options.studioId,
      status: 'running',
      message: 'Starting',
      updatedAt: new Date().toISOString(),
    }),
  );

  const scriptPath = path.join(hubRoot, 'launcher', 'run-studio.sh');
  const env = {
    ...process.env,
    STUDIO_ID: merged.id,
    WEB_DIR: merged.webDir ?? '',
    EXPRESS_DIR: merged.expressDir ?? '',
    WORKSPACE_FILE: merged.workspaceFile ?? '',
    API_PORT: String(merged.apiPort),
    WEB_PORT_START: String(merged.webPortStart),
    HEALTH_PATH: merged.healthPath,
    NVM_SH: merged.nvmSh,
    CURSOR_BIN: merged.cursorBin,
    CURSOR_OPEN_FLAGS: merged.cursorOpenFlags,
    OPEN_WORKSPACE: options.openWorkspace ? '1' : '0',
    OPEN_CHROME: options.openChrome ? '1' : '0',
    START_SERVERS: options.startServers ? '1' : '0',
    JOB_FILE: jobFile,
    HUB_TMP,
  };

  const child = spawn('zsh', [scriptPath], {
    env,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  return jobId;
};
