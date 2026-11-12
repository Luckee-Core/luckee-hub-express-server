#!/usr/bin/env node
/**
 * One-off migration: add repo.role, replace expressEnv.groups with dataPlane where applicable.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const registryPath = path.join(__dirname, '../data/projects.registry.json');

const CONSOLE_NAMES = new Set([
  'trade-stocks-using-ai-console',
  'my-vercel-analytics-console',
  'on-device-dispatcher-console',
  'app-store-manager-console',
  'my-nonprofit-console',
  'my-ai-threads-console',
]);

const DATA_PLANE_BY_ID = {
  'code-control': {
    modeKey: 'STORAGE_ACCESS_MODE',
    options: [
      {
        id: 'direct',
        label: 'Direct storage',
        value: 'direct',
        keys: ['CODE_CONTROL_STORAGE_URL', 'CODE_CONTROL_STORAGE_SECRET', 'CODE_CONTROL_DIRECT_URL', 'CODE_CONTROL_DIRECT_SECRET'],
      },
      {
        id: 'gateway',
        label: 'Studio gateway',
        value: 'gateway',
        keys: ['MAIN_GATEWAY_URL', 'MAIN_GATEWAY_PROJECT_ID', 'DISPATCHER_GATE_SECRET'],
      },
    ],
  },
  'code-commit-summaries': {
    modeKey: 'STORAGE_MODE',
    options: [
      {
        id: 'local',
        label: 'Local Postgres',
        value: 'local',
        keys: ['DATABASE_URL', 'PG_POOL_MAX'],
        usesLocalDatabase: true,
      },
      {
        id: 'remote',
        label: 'Remote storage',
        value: 'remote',
        keys: ['STORAGE_EXPRESS_URL', 'STORAGE_EXPRESS_SECRET', 'DISPATCHER_GATE_SECRET'],
      },
    ],
  },
  'my-gmail-manager': {
    modeKey: 'STORAGE_MODE',
    options: [
      {
        id: 'local',
        label: 'Local Postgres',
        value: 'local',
        keys: ['DATABASE_URL', 'PG_POOL_MAX'],
        usesLocalDatabase: true,
      },
      {
        id: 'remote',
        label: 'Remote storage',
        value: 'remote',
        keys: ['STORAGE_EXPRESS_URL', 'STORAGE_EXPRESS_SECRET', 'DISPATCHER_GATE_SECRET'],
      },
    ],
  },
  'my-fundraise': {
    modeKey: 'CANONICAL_DATA_ACCESS_MODE',
    options: [
      {
        id: 'direct',
        label: 'Direct storage',
        value: 'direct',
        keys: ['MY_FUNDRAISE_STORAGE_URL', 'MY_FUNDRAISE_STORAGE_SECRET'],
      },
      {
        id: 'gateway',
        label: 'Studio gateway',
        value: 'gateway',
        keys: ['MAIN_GATEWAY_URL', 'DISPATCHER_GATE_SECRET'],
      },
    ],
  },
  'finances-manager': {
    modeKey: 'CANONICAL_DATA_ACCESS_MODE',
    options: [
      {
        id: 'direct',
        label: 'Direct storage',
        value: 'direct',
        keys: ['FINANCES_MANAGER_STORAGE_URL', 'FINANCES_MANAGER_STORAGE_SECRET', 'FINANCES_MANAGER_DIRECT_URL', 'FINANCES_MANAGER_DIRECT_SECRET'],
      },
      {
        id: 'gateway',
        label: 'Studio gateway',
        value: 'gateway',
        keys: ['FINANCES_MANAGER_GATEWAY_URL', 'FINANCES_MANAGER_GATEWAY_PROJECT_ID', 'MAIN_GATEWAY_URL', 'DISPATCHER_GATE_SECRET'],
      },
    ],
  },
  'estimate-and-proposals': {
    modeKey: 'CANONICAL_DATA_ACCESS_MODE',
    options: [
      {
        id: 'direct',
        label: 'Direct storage',
        value: 'direct',
        keys: ['ESTIMATE_PROPOSALS_STORAGE_URL', 'ESTIMATE_PROPOSALS_STORAGE_SECRET'],
      },
      {
        id: 'gateway',
        label: 'Studio gateway',
        value: 'gateway',
        keys: ['MAIN_GATEWAY_URL', 'DISPATCHER_GATE_SECRET'],
      },
    ],
  },
  'make-it-sound-like-me': {
    modeKey: 'MISLM_STORAGE_ACCESS_MODE',
    options: [
      {
        id: 'direct',
        label: 'Direct storage',
        value: 'direct',
        keys: ['MISLM_STORAGE_DIRECT_URL'],
      },
      {
        id: 'gateway',
        label: 'Studio gateway',
        value: 'gateway',
        keys: ['ON_DEVICE_DISPATCHER_GATEWAY_URL', 'DISPATCHER_GATE_SECRET'],
      },
    ],
  },
};

const DISPATCHER_REPOS = {
  'finances-manager': {
    repoType: 'express',
    repoName: 'finances-manager-dispatcher-express-server',
    role: 'dispatcher',
    defaultApiPort: 3090,
    healthPath: '/api/health',
  },
  'estimate-and-proposals': {
    repoType: 'express',
    repoName: 'estimate-and-proposals-express-dispatcher-server',
    role: 'dispatcher',
    defaultApiPort: 3093,
    healthPath: '/api/health',
  },
};

const inferRole = (repo) => {
  if (repo.role) {
    return repo.role;
  }
  if (repo.repoType === 'storage-express') {
    return 'storage';
  }
  if (repo.repoType === 'express') {
    return 'express';
  }
  if (repo.repoType === 'nextjs') {
    if (CONSOLE_NAMES.has(repo.repoName) || repo.repoName.endsWith('-console')) {
      return 'console';
    }
    if (repo.repoName.includes('dispatcher-web')) {
      return 'dispatcher-web';
    }
    return 'web';
  }
  return 'web';
};

const raw = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

for (const project of raw) {
  project.repos = (project.repos ?? []).map((repo) => ({
    ...repo,
    role: inferRole(repo),
  }));

  const dispatcherRepo = DISPATCHER_REPOS[project.id];
  if (dispatcherRepo && !project.repos.some((r) => r.repoName === dispatcherRepo.repoName)) {
    project.repos.push({ ...dispatcherRepo });
  }

  if (project.expressEnv?.groups) {
    const dataPlane = DATA_PLANE_BY_ID[project.id];
    if (dataPlane) {
      project.dataPlane = dataPlane;
    }
    delete project.expressEnv.groups;
    if (Object.keys(project.expressEnv).length === 0) {
      delete project.expressEnv;
    }
  }
}

fs.writeFileSync(registryPath, `${JSON.stringify(raw, null, 2)}\n`);
console.log('✅ Migrated registry roles and dataPlane');
