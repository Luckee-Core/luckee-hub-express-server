import fs from 'fs';
import path from 'path';

import type {
  HubLocalConfig,
  ProjectLocalEntry,
  ProjectRegistryEntry,
} from '../../services/projects/types';
import { writeJobFile } from '../terminals/write-job-file';
import type { LauncherJobFile } from '../terminals/write-job-file';
import { createSetupDebugLog } from '../../utils/launcher/log-setup-debug';
import {
  buildSetupSteps,
  expireStaleSetupJobs,
  getActiveSetupJobId,
  getSetupCloneStepId,
  getSetupInstallStepId,
  getSetupWorkspaceStepId,
  writeSetupJobStep,
} from '../../utils/launcher/setup-job';
import {
  cloneGitRepo,
  DEFAULT_GITHUB_ORG,
  getNextjsRegistryRepo,
  npmInstallRepo,
  readLocalConfig,
  readRegistry,
  resolveLuckeeParent,
  resolveProjectClonePaths,
  resolveProjectWorkspaceFilePath,
  toGithubRepoUrl,
  writeLocalConfig,
  writeProjectWorkspaceFile,
} from '../../utils/projects';
import { getHubRoot } from '../../utils/projects/get-hub-root';

export type SetupProjectResult = {
  jobId: string;
};

export type SetupProjectPaths = {
  webDir?: string;
  expressDir?: string;
  workspaceFile?: string;
};

const upsertProjectLocalEntry = (
  localConfig: HubLocalConfig,
  projectId: string,
  paths: SetupProjectPaths,
  webPortStart?: number,
): HubLocalConfig => {
  const existing = localConfig.projects?.[projectId] ?? {};
  const nextEntry: ProjectLocalEntry = {
    ...existing,
    enabled: true,
    ...(paths.webDir ? { webDir: paths.webDir } : {}),
    ...(paths.expressDir ? { expressDir: paths.expressDir } : {}),
    ...(paths.workspaceFile ? { workspaceFile: paths.workspaceFile } : {}),
    ...(webPortStart !== undefined ? { webPortStart } : {}),
  };

  return {
    ...localConfig,
    projects: {
      ...localConfig.projects,
      [projectId]: nextEntry,
    },
  };
};

const resolveRepoDir = (
  paths: SetupProjectPaths,
  repoType: 'express' | 'nextjs',
): string | undefined => {
  if (repoType === 'express') {
    return paths.expressDir;
  }
  return paths.webDir;
};

type ResolvedSetupPaths = SetupProjectPaths & {
  luckeeRoot: string;
  projectRoot: string;
  /** Keep the saved workspace path when the checkout already lives outside luckee/. */
  preserveWorkspaceFile: boolean;
};

const existingDirectory = (dir: string | undefined): string | undefined =>
  dir && fs.existsSync(dir) ? dir : undefined;

/**
 * Prefer checkouts already recorded in hub.local.json.
 * Fresh projects still clone under `{luckeeParent}/luckee/{projectId}/`.
 */
const resolveSetupPaths = (
  luckeeParent: string,
  registry: ProjectRegistryEntry,
  localConfig: HubLocalConfig,
  projectId: string,
): ResolvedSetupPaths => {
  const cloned = resolveProjectClonePaths(luckeeParent, registry);
  const existing = localConfig.projects?.[projectId];
  const existingWebDir = existingDirectory(existing?.webDir);
  const existingExpressDir = existingDirectory(existing?.expressDir);
  const webSatisfied = !cloned.webDir || !!existingWebDir;
  const expressSatisfied = !cloned.expressDir || !!existingExpressDir;
  const usingExistingCheckout = webSatisfied && expressSatisfied && (!!existingWebDir || !!existingExpressDir);

  if (!usingExistingCheckout) {
    return {
      luckeeRoot: cloned.luckeeRoot,
      projectRoot: cloned.projectRoot,
      webDir: cloned.webDir,
      expressDir: cloned.expressDir,
      workspaceFile: resolveProjectWorkspaceFilePath(cloned.projectRoot, projectId),
      preserveWorkspaceFile: false,
    };
  }

  const webDir = existingWebDir ?? cloned.webDir;
  const expressDir = existingExpressDir ?? cloned.expressDir;
  const projectRoot = path.dirname(webDir ?? expressDir ?? cloned.projectRoot);
  const existingWorkspace = existingDirectory(existing?.workspaceFile);

  return {
    luckeeRoot: path.dirname(projectRoot),
    projectRoot,
    webDir,
    expressDir,
    workspaceFile: existingWorkspace ?? resolveProjectWorkspaceFilePath(projectRoot, projectId),
    preserveWorkspaceFile: !!existingWorkspace,
  };
};

const runSetupJob = async (
  jobId: string,
  projectId: string,
  registry: ProjectRegistryEntry,
  localConfig: HubLocalConfig,
  luckeeParent: string,
  githubOrg: string,
): Promise<void> => {
  const paths = resolveSetupPaths(luckeeParent, registry, localConfig, projectId);
  const nvmSh = localConfig.nvmSh ?? `${process.env.HOME}/.nvm/nvm.sh`;
  const debugLog = createSetupDebugLog(jobId);
  let lastOutputFlushMs = 0;

  const publishStep = (
    stepId: string,
    patch: { status?: 'pending' | 'running' | 'done' | 'skipped' | 'failed'; message?: string },
    topLevelMessage?: string,
  ): void => {
    writeSetupJobStep(jobId, stepId, patch, topLevelMessage, debugLog.tail());
  };

  const publishOutput = (stepId: string, line: string): void => {
    debugLog.write(`📥 [launcher.processSetupProject] ${line}`);
    const now = Date.now();
    if (now - lastOutputFlushMs < 400) {
      return;
    }
    lastOutputFlushMs = now;
    publishStep(stepId, { status: 'running', message: line }, line);
  };

  try {
    const jobPath = path.join('/tmp/luckee-hub/jobs', `${jobId}.json`);
    if (fs.existsSync(jobPath)) {
      const currentJob = JSON.parse(fs.readFileSync(jobPath, 'utf8')) as LauncherJobFile;
      writeJobFile({
        ...currentJob,
        message: `Debug log: ${debugLog.filePath}`,
        logTail: debugLog.tail(),
        updatedAt: new Date().toISOString(),
      });
    }

    debugLog.write(`🚀 [launcher.processSetupProject] Setup started for ${projectId}`);
    fs.mkdirSync(paths.luckeeRoot, { recursive: true });
    fs.mkdirSync(paths.projectRoot, { recursive: true });

    for (const repo of registry.repos) {
      const stepId = getSetupCloneStepId(repo.repoName);
      const destDir = resolveRepoDir(paths, repo.repoType);
      if (!destDir) {
        throw new Error(`Unsupported repo type for ${repo.repoName}`);
      }

      debugLog.write(`🚀 [launcher.processSetupProject] Cloning ${repo.repoName} into ${destDir}`);
      publishStep(stepId, { status: 'running' }, `Cloning ${repo.repoName}...`);

      const repoUrl = toGithubRepoUrl(githubOrg, repo.repoName);
      if (!repoUrl) {
        throw new Error(`Missing repo URL for ${repo.repoName}`);
      }

      const cloneResult = cloneGitRepo(repoUrl, destDir);
      debugLog.write(
        `✅ [launcher.processSetupProject] ${cloneResult === 'cloned' ? 'Cloned' : 'Skipped clone'} ${repo.repoName}`,
      );
      publishStep(
        stepId,
        {
          status: cloneResult === 'cloned' ? 'done' : 'skipped',
          message: cloneResult === 'cloned' ? 'Cloned' : 'Already cloned',
        },
        cloneResult === 'cloned' ? `Cloned ${repo.repoName}` : `Skipped clone ${repo.repoName}`,
      );
    }

    const workspaceFile = paths.workspaceFile ?? resolveProjectWorkspaceFilePath(paths.projectRoot, projectId);
    const workspaceStepId = getSetupWorkspaceStepId();
    debugLog.write(`🚀 [launcher.processSetupProject] Writing Cursor workspace ${workspaceFile}`);
    publishStep(workspaceStepId, { status: 'running' }, 'Creating Cursor workspace...');

    const workspaceResult = paths.preserveWorkspaceFile
      ? 'skipped'
      : writeProjectWorkspaceFile(paths.projectRoot, projectId, registry);
    debugLog.write(
      `✅ [launcher.processSetupProject] ${workspaceResult === 'written' ? 'Created' : 'Skipped'} Cursor workspace ${workspaceFile}`,
    );
    publishStep(
      workspaceStepId,
      {
        status: workspaceResult === 'written' ? 'done' : 'skipped',
        message: workspaceResult === 'written' ? 'Created' : 'Already exists',
      },
      workspaceResult === 'written' ? 'Created Cursor workspace' : 'Skipped Cursor workspace',
    );

    const nextjsRepo = getNextjsRegistryRepo(registry);
    const webPortStart =
      localConfig.projects?.[projectId]?.webPortStart ?? nextjsRepo?.defaultWebPortStart;
    const hubRoot = getHubRoot();
    writeLocalConfig(
      hubRoot,
      upsertProjectLocalEntry(
        localConfig,
        projectId,
        { webDir: paths.webDir, expressDir: paths.expressDir, workspaceFile },
        webPortStart,
      ),
    );

    for (const repo of registry.repos) {
      const stepId = getSetupInstallStepId(repo.repoName);
      const destDir = resolveRepoDir(paths, repo.repoType);
      if (!destDir) {
        throw new Error(`Unsupported repo type for ${repo.repoName}`);
      }

      debugLog.write(`🚀 [launcher.processSetupProject] npm install in ${destDir}`);
      publishStep(stepId, { status: 'running' }, `Installing dependencies in ${repo.repoName}...`);

      const installResult = await npmInstallRepo(destDir, nvmSh, (line) => publishOutput(stepId, line));
      debugLog.write(
        `✅ [launcher.processSetupProject] ${installResult === 'installed' ? 'Installed' : 'Skipped install'} ${repo.repoName}`,
      );
      publishStep(
        stepId,
        {
          status: installResult === 'installed' ? 'done' : 'skipped',
          message: installResult === 'installed' ? 'Installed' : 'Already installed',
        },
        installResult === 'installed'
          ? `Installed ${repo.repoName}`
          : `Skipped install ${repo.repoName}`,
      );
    }

    const completedJobPath = path.join('/tmp/luckee-hub/jobs', `${jobId}.json`);
    const currentJob = fs.existsSync(completedJobPath)
      ? (JSON.parse(fs.readFileSync(completedJobPath, 'utf8')) as LauncherJobFile)
      : null;

    debugLog.write(`✅ [launcher.processSetupProject] Setup complete for ${projectId}`);
    writeJobFile({
      jobId,
      projectId,
      status: 'completed',
      message: 'Setup complete',
      steps: currentJob?.steps,
      logTail: debugLog.tail(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Setup failed';
    debugLog.write(`❌ [launcher.processSetupProject] ${message}`);
    const nextjsRepo = getNextjsRegistryRepo(registry);
    const webPortStart =
      localConfig.projects?.[projectId]?.webPortStart ?? nextjsRepo?.defaultWebPortStart;

    try {
      const hubRoot = getHubRoot();
      writeLocalConfig(
        hubRoot,
        upsertProjectLocalEntry(
          localConfig,
          projectId,
          {
            webDir: paths.webDir,
            expressDir: paths.expressDir,
            workspaceFile: resolveProjectWorkspaceFilePath(paths.projectRoot, projectId),
          },
          webPortStart,
        ),
      );
    } catch {
      // Best-effort: preserve cloned paths even when install fails.
    }

    const jobPath = path.join('/tmp/luckee-hub/jobs', `${jobId}.json`);
    const currentJob = fs.existsSync(jobPath)
      ? (JSON.parse(fs.readFileSync(jobPath, 'utf8')) as LauncherJobFile)
      : null;

    const failedSteps = currentJob?.steps?.map((step) =>
      step.status === 'running' || step.status === 'pending'
        ? { ...step, status: 'failed' as const, message }
        : step,
    );

    writeJobFile({
      jobId,
      projectId,
      status: 'failed',
      message,
      steps: failedSteps,
      logTail: debugLog.tail(),
      updatedAt: new Date().toISOString(),
    });
  }
};

/**
 * Start async setup: clone project repos and npm install into luckee/.
 */
export const processSetupProject = (projectId: string): SetupProjectResult | { error: string } => {
  const hubRoot = getHubRoot();
  const registry = readRegistry(hubRoot);
  const localConfig = readLocalConfig(hubRoot);
  const entry = registry.find((project) => project.id === projectId);

  if (!entry) {
    return { error: 'Project not found in catalog' };
  }

  const luckeeParent = resolveLuckeeParent(localConfig);
  if (!luckeeParent) {
    return { error: 'Set luckeeParent in hub config before running Setup' };
  }

  if (!path.isAbsolute(luckeeParent)) {
    return { error: 'luckeeParent must be an absolute path' };
  }

  expireStaleSetupJobs(projectId);

  const activeJobId = getActiveSetupJobId(projectId);
  if (activeJobId) {
    return { jobId: activeJobId };
  }

  const githubOrg = localConfig.githubOrg ?? DEFAULT_GITHUB_ORG;
  const jobId = `setup-${projectId}-${Date.now()}`;
  const steps = buildSetupSteps(entry);

  writeJobFile({
    jobId,
    projectId,
    status: 'running',
    message: 'Starting setup...',
    steps,
    updatedAt: new Date().toISOString(),
  });

  void runSetupJob(jobId, projectId, entry, localConfig, luckeeParent, githubOrg);

  return { jobId };
};
