import fs from 'fs';
import path from 'path';

import { processEnsureLocalDatabaseForRun } from '../local-database/process-ensure-local-database-for-run';
import { processEnsureSupabaseConfigForRun } from '../supabase-config/process-ensure-supabase-config-for-run';
import { applyWebOpenPath, openInChrome } from '../../utils/launcher';
import {
  apiDepsInstalled,
  detectApiRuntime,
  mergeProjectConfig,
  projectHasNextjsRepo,
  readLocalConfig,
  readRegistry,
  resolveProjectPortsForRun,
  withResolvedApiPort,
  writeResolvedProjectPorts,
} from '../../utils/projects';
import {
  findOwnedNextWebUrl,
  isExpressHealthy,
  waitForExpressHealth,
  waitForOwnedNextWebUrl,
} from '../../utils/projects/wait-for-project-ready';
import {
  buildExpressPtyCommand,
  buildWebOnlyPtyCommand,
  spawnProjectPty,
} from './spawn-project-pty';
import {
  resolveRunTargets,
  runTargetsInclude,
  type ProjectRunTarget,
} from '../launcher/run-project-targets';
import { clearSuppressedRolesForTargets } from './session-registry';
import { stopProjectDevServersForRun } from './stop-project-dev-servers-for-run';
import type { RunEmbeddedResult, TerminalSessionInfo } from './types';
import { writeJobFile } from './write-job-file';

const HUB_TMP = '/tmp/luckee-hub';

const hasNodeModules = (dir?: string): boolean => !!(dir && fs.existsSync(`${dir}/node_modules`));

/**
 * Background: wait for Express, spawn Web PTY, open Chrome, finalize job file.
 */
const completeEmbeddedJob = async (
  jobId: string,
  projectId: string,
  merged: NonNullable<ReturnType<typeof mergeProjectConfig>>,
  sessions: TerminalSessionInfo[],
  needsExpressWait: boolean,
  webPortStart: number,
  apiUrl: string,
  targets: ProjectRunTarget[],
): Promise<void> => {
  const wantsWeb = runTargetsInclude(targets, 'web');
  const wantsExpress = runTargetsInclude(targets, 'express');

  try {
    if (needsExpressWait && wantsExpress) {
      writeJobFile({
        jobId,
        projectId,
        status: 'running',
        message: 'Waiting for Express health...',
        sessions,
        updatedAt: new Date().toISOString(),
      });

      const ok = await waitForExpressHealth(
        merged.apiPort,
        merged.healthPath,
        180,
        merged.expressDir,
      );
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
    if (wantsWeb && merged.webDir && projectHasNextjsRepo(merged.registry)) {
      writeJobFile({
        jobId,
        projectId,
        status: 'running',
        message: 'Starting Web dev server (first free port from 3000)...',
        sessions,
        updatedAt: new Date().toISOString(),
      });

      try {
        const webSession = spawnProjectPty({
          projectId,
          role: 'web',
          label: `${projectId} / Web`,
          command: buildWebOnlyPtyCommand(merged),
          cwd: merged.webDir,
          port: webPortStart,
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

      webUrl = await waitForOwnedNextWebUrl(120, merged.webDir);
      if (!webUrl) {
        webUrl = findOwnedNextWebUrl(merged.webDir);
      }
      if (webUrl) {
        const { writeFileSync, mkdirSync } = await import('fs');
        mkdirSync(HUB_TMP, { recursive: true });
        writeFileSync(`${HUB_TMP}/${projectId}-web-url.txt`, `${webUrl}\n`);

        const webPort = Number(new URL(webUrl).port) || webPortStart;
        writeResolvedProjectPorts(projectId, {
          apiPort: merged.apiPort,
          webPort,
          webPortStart,
          apiUrl,
          webUrl,
        });
      }
    } else if (wantsExpress && merged.apiPort > 0) {
      writeResolvedProjectPorts(projectId, {
        apiPort: merged.apiPort,
        webPortStart,
        apiUrl,
      });
    }

    if (webUrl) {
      openInChrome(applyWebOpenPath(webUrl, merged.registry.webOpenPath));
    }

    const message = webUrl
      ? 'Done'
      : wantsWeb && !wantsExpress
        ? 'Web running (API not started)'
        : wantsExpress && !wantsWeb
          ? 'Express running'
          : 'Express running (Web URL not detected)';

    writeJobFile({
      jobId,
      projectId,
      status: 'completed',
      message,
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

type ProcessRunEmbeddedOptions = {
  targets?: ProjectRunTarget[];
};

/**
 * Spawn embedded PTYs for a project Run job; Express first, Web after health (async).
 */
export const processRunEmbedded = (
  projectId: string,
  options: ProcessRunEmbeddedOptions = {},
): RunEmbeddedResult | null => {
  const hubRoot = path.resolve(__dirname, '../../..');
  const registry = readRegistry(hubRoot);
  const localConfig = readLocalConfig(hubRoot);
  const entry = registry.find((s) => s.id === projectId);
  if (!entry) {
    return null;
  }

  const resolvedTargets = resolveRunTargets(entry, options.targets);
  if ('error' in resolvedTargets) {
    return null;
  }
  const targets = resolvedTargets;
  const wantsExpress = runTargetsInclude(targets, 'express');
  const wantsWeb = runTargetsInclude(targets, 'web');

  const merged = mergeProjectConfig(entry, localConfig);
  if (!merged) {
    return null;
  }

  const { apiPort, webPortStart, apiUrl } = resolveProjectPortsForRun(merged);
  const runMerged = {
    ...withResolvedApiPort(merged, apiPort),
    webPortStart,
  };
  clearSuppressedRolesForTargets(projectId, targets);
  stopProjectDevServersForRun(projectId, entry, runMerged, targets);
  writeResolvedProjectPorts(projectId, {
    apiPort,
    webPortStart,
    apiUrl,
  });

  const jobId = `${projectId}-${Date.now()}`;
  const sessions: TerminalSessionInfo[] = [];

  const apiRuntime = detectApiRuntime(runMerged.expressDir);
  if (wantsExpress && runMerged.expressDir && !apiDepsInstalled(runMerged.expressDir)) {
    writeJobFile({
      jobId,
      projectId,
      status: 'failed',
      message:
        apiRuntime === 'python'
          ? 'Python dependencies are not installed — run Setup first'
          : 'Express dependencies are not installed — run Setup first',
      sessions,
      updatedAt: new Date().toISOString(),
    });
    return { jobId, sessions };
  }

  if (
    wantsWeb &&
    runMerged.webDir &&
    projectHasNextjsRepo(runMerged.registry) &&
    !hasNodeModules(runMerged.webDir)
  ) {
    writeJobFile({
      jobId,
      projectId,
      status: 'failed',
      message: 'Web dependencies are not installed — run Setup first',
      sessions,
      updatedAt: new Date().toISOString(),
    });
    return { jobId, sessions };
  }

  if (wantsExpress) {
    const ensureResult = processEnsureLocalDatabaseForRun(projectId);
    if ('error' in ensureResult) {
    writeJobFile({
      jobId,
      projectId,
      status: 'failed',
      message: `Postgres setup failed: ${ensureResult.error}`,
      sessions,
      updatedAt: new Date().toISOString(),
    });
      return { jobId, sessions };
    }
  }

  if (wantsExpress) {
    const supabaseEnsure = processEnsureSupabaseConfigForRun(projectId);
    if ('error' in supabaseEnsure) {
    writeJobFile({
      jobId,
      projectId,
      status: 'failed',
      message: `Supabase setup failed: ${supabaseEnsure.error}`,
      sessions,
      updatedAt: new Date().toISOString(),
    });
      return { jobId, sessions };
    }
  }

  const expressHealthy =
    !runMerged.expressDir ||
    isExpressHealthy(runMerged.apiPort, runMerged.healthPath, runMerged.expressDir);

  let needsExpressWait = false;
  if (wantsExpress) {
    needsExpressWait = !!(runMerged.expressDir && !expressHealthy);
  }

  if (needsExpressWait) {
    try {
      const session = spawnProjectPty({
        projectId,
        role: 'express',
        label: `${projectId} / ${apiRuntime === 'python' ? 'Python' : 'Express'}`,
        command: buildExpressPtyCommand(runMerged),
        cwd: runMerged.expressDir!,
        port: runMerged.apiPort,
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
    message: needsExpressWait
      ? apiRuntime === 'python'
        ? 'Starting Python...'
        : 'Starting Express...'
      : wantsWeb
        ? 'Starting Web...'
        : 'Starting...',
    sessions,
    updatedAt: new Date().toISOString(),
  });

  void completeEmbeddedJob(
    jobId,
    projectId,
    runMerged,
    sessions,
    needsExpressWait,
    webPortStart,
    apiUrl,
    targets,
  ).catch(
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
