import fs from 'fs';
import path from 'path';

import type {
  HubLocalConfig,
  ProjectLocalEntry,
  ProjectRegistryEntry,
} from '../../services/projects/types';
import { writeJobFile } from '../terminals/write-job-file';
import type { LauncherJobFile } from '../terminals/write-job-file';
import {
  buildSetupSteps,
  expireStaleSetupJobs,
  getActiveSetupJobId,
  getSetupCloneStepId,
  getSetupInstallStepId,
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
  toGithubRepoUrl,
  writeLocalConfig,
} from '../../utils/projects';
import { getHubRoot } from '../../utils/projects/get-hub-root';

export type SetupProjectResult = {
  jobId: string;
};

export type SetupProjectPaths = {
  webDir?: string;
  expressDir?: string;
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

const runSetupJob = async (
  jobId: string,
  projectId: string,
  registry: ProjectRegistryEntry,
  localConfig: HubLocalConfig,
  luckeeParent: string,
  githubOrg: string,
): Promise<void> => {
  const paths = resolveProjectClonePaths(luckeeParent, registry);
  const nvmSh = localConfig.nvmSh ?? `${process.env.HOME}/.nvm/nvm.sh`;

  try {
    fs.mkdirSync(paths.luckeeRoot, { recursive: true });
    fs.mkdirSync(paths.projectRoot, { recursive: true });

    for (const repo of registry.repos) {
      const stepId = getSetupCloneStepId(repo.repoName);
      const destDir = resolveRepoDir(paths, repo.repoType);
      if (!destDir) {
        throw new Error(`Unsupported repo type for ${repo.repoName}`);
      }

      writeSetupJobStep(jobId, stepId, { status: 'running' }, `Cloning ${repo.repoName}...`);

      const repoUrl = toGithubRepoUrl(githubOrg, repo.repoName);
      if (!repoUrl) {
        throw new Error(`Missing repo URL for ${repo.repoName}`);
      }

      const cloneResult = cloneGitRepo(repoUrl, destDir);
      writeSetupJobStep(
        jobId,
        stepId,
        {
          status: cloneResult === 'cloned' ? 'done' : 'skipped',
          message: cloneResult === 'cloned' ? 'Cloned' : 'Already cloned',
        },
        cloneResult === 'cloned' ? `Cloned ${repo.repoName}` : `Skipped clone ${repo.repoName}`,
      );
    }

    const nextjsRepo = getNextjsRegistryRepo(registry);
    const webPortStart =
      localConfig.projects?.[projectId]?.webPortStart ?? nextjsRepo?.defaultWebPortStart;
    const hubRoot = getHubRoot();
    writeLocalConfig(
      hubRoot,
      upsertProjectLocalEntry(
        localConfig,
        projectId,
        { webDir: paths.webDir, expressDir: paths.expressDir },
        webPortStart,
      ),
    );

    for (const repo of registry.repos) {
      const stepId = getSetupInstallStepId(repo.repoName);
      const destDir = resolveRepoDir(paths, repo.repoType);
      if (!destDir) {
        throw new Error(`Unsupported repo type for ${repo.repoName}`);
      }

      writeSetupJobStep(
        jobId,
        stepId,
        { status: 'running' },
        `Installing dependencies in ${repo.repoName}...`,
      );

      const installResult = await npmInstallRepo(destDir, nvmSh);
      writeSetupJobStep(
        jobId,
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

    const jobPath = path.join('/tmp/luckee-hub/jobs', `${jobId}.json`);
    const currentJob = fs.existsSync(jobPath)
      ? (JSON.parse(fs.readFileSync(jobPath, 'utf8')) as LauncherJobFile)
      : null;

    writeJobFile({
      jobId,
      projectId,
      status: 'completed',
      message: 'Setup complete',
      steps: currentJob?.steps,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Setup failed';
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
          { webDir: paths.webDir, expressDir: paths.expressDir },
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
