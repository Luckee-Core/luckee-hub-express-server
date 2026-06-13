import { execSync } from 'child_process';
import path from 'path';

import { openInChrome } from '../../utils/launcher';
import { mergeProjectConfig, readLocalConfig, readRegistry } from '../../utils/projects';
import {
  findAvailableWebPort,
  findNextWebUrl,
  waitForExpressHealth,
  waitForNextWebUrl,
} from '../../utils/projects/wait-for-project-ready';
import {
  buildExpressPtyCommand,
  buildWebOnlyPtyCommand,
  spawnProjectPty,
} from './spawn-project-pty';
import type { RunEmbeddedResult, TerminalSessionInfo } from './types';
import { writeJobFile } from './write-job-file';

const HUB_TMP = '/tmp/luckee-hub';

const expressAlreadyHealthy = (apiPort: number, healthPath: string): boolean => {
  try {
    const out = execSync(`curl -fsS "http://127.0.0.1:${apiPort}${healthPath}" 2>/dev/null`, {
      encoding: 'utf8',
      timeout: 3000,
    });
    return out.includes('"ok"');
  } catch {
    return false;
  }
};

/**
 * Background: wait for Express, spawn Web PTY, open Chrome, finalize job file.
 */
const completeEmbeddedJob = async (
  jobId: string,
  projectId: string,
  merged: NonNullable<ReturnType<typeof mergeProjectConfig>>,
  sessions: TerminalSessionInfo[],
  needsExpressWait: boolean,
): Promise<void> => {
  try {
    if (needsExpressWait) {
      writeJobFile({
        jobId,
        projectId,
        status: 'running',
        message: 'Waiting for Express health...',
        sessions,
        updatedAt: new Date().toISOString(),
      });

      const ok = await waitForExpressHealth(merged.apiPort, merged.healthPath);
      if (!ok) {
        writeJobFile({
          jobId,
          projectId,
          status: 'failed',
          message: 'Express health check timed out — check the Express terminal tab',
          sessions,
          updatedAt: new Date().toISOString(),
        });
        return;
      }
    }

    let webUrl: string | undefined;
    if (merged.webDir && !merged.registry.apiOnly) {
      webUrl = findNextWebUrl(merged.webPortStart);

      if (webUrl) {
        writeJobFile({
          jobId,
          projectId,
          status: 'running',
          message: 'Next.js already running',
          sessions,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const webPort = findAvailableWebPort(merged.webPortStart);

        writeJobFile({
          jobId,
          projectId,
          status: 'running',
          message: `Starting Web dev server on :${webPort}...`,
          sessions,
          updatedAt: new Date().toISOString(),
        });

        try {
          const webSession = spawnProjectPty({
            projectId,
            role: 'web',
            label: `${projectId} / Web`,
            command: buildWebOnlyPtyCommand(merged, webPort),
            cwd: merged.webDir,
            port: webPort,
          });
          sessions.push(webSession);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Failed to spawn Web terminal';
          writeJobFile({
            jobId,
            projectId,
            status: 'failed',
            message,
            sessions,
            updatedAt: new Date().toISOString(),
          });
          return;
        }

        writeJobFile({
          jobId,
          projectId,
          status: 'running',
          message: 'Waiting for Next.js...',
          sessions,
          updatedAt: new Date().toISOString(),
        });

        webUrl = await waitForNextWebUrl(merged.webPortStart);
        if (!webUrl) {
          webUrl = findNextWebUrl(merged.webPortStart);
        }
      }
      if (webUrl) {
        const { writeFileSync, mkdirSync } = await import('fs');
        mkdirSync(HUB_TMP, { recursive: true });
        writeFileSync(`${HUB_TMP}/${projectId}-web-url.txt`, `${webUrl}\n`);
      }
    }

    if (webUrl) {
      openInChrome(webUrl);
    }

    writeJobFile({
      jobId,
      projectId,
      status: 'completed',
      message: webUrl ? 'Done' : 'Express running (Web URL not detected)',
      webUrl,
      sessions,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Embedded run failed';
    writeJobFile({
      jobId,
      projectId,
      status: 'failed',
      message,
      sessions,
      updatedAt: new Date().toISOString(),
    });
  }
};

/**
 * Spawn embedded PTYs for a project Run job; Express first, Web after health (async).
 */
export const processRunEmbedded = (projectId: string): RunEmbeddedResult | null => {
  const hubRoot = path.resolve(__dirname, '../../..');
  const registry = readRegistry(hubRoot);
  const localConfig = readLocalConfig(hubRoot);
  const entry = registry.find((s) => s.id === projectId);
  if (!entry) {
    return null;
  }

  const merged = mergeProjectConfig(entry, localConfig);
  if (!merged) {
    return null;
  }

  const jobId = `${projectId}-${Date.now()}`;
  const sessions: TerminalSessionInfo[] = [];

  const expressHealthy =
    !merged.expressDir || expressAlreadyHealthy(merged.apiPort, merged.healthPath);

  const needsExpressWait = !!(merged.expressDir && !expressHealthy);

  if (needsExpressWait) {
    try {
      const session = spawnProjectPty({
        projectId,
        role: 'express',
        label: `${projectId} / Express`,
        command: buildExpressPtyCommand(merged),
        cwd: merged.expressDir!,
        port: merged.apiPort,
      });
      sessions.push(session);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to spawn Express terminal';
      writeJobFile({
        jobId,
        projectId,
        status: 'failed',
        message,
        sessions,
        updatedAt: new Date().toISOString(),
      });
      return { jobId, sessions };
    }
  }

  writeJobFile({
    jobId,
    projectId,
    status: 'running',
    message: needsExpressWait ? 'Starting Express...' : 'Starting Web...',
    sessions,
    updatedAt: new Date().toISOString(),
  });

  void completeEmbeddedJob(jobId, projectId, merged, sessions, needsExpressWait).catch(
    (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Embedded run failed';
      writeJobFile({
        jobId,
        projectId,
        status: 'failed',
        message,
        sessions,
        updatedAt: new Date().toISOString(),
      });
    },
  );

  return { jobId, sessions };
};
