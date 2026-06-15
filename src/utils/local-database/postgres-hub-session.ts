import fs from 'fs';
import path from 'path';

import { getHubRoot } from './resolve-project-for-database';

type HubStartedPostgresEntry = {
  projectId: string;
  formula: string;
  startedAt: string;
};

type PostgresHubSessionFile = {
  startedByHub: HubStartedPostgresEntry[];
};

const getSessionPath = (): string =>
  path.join(getHubRoot(), 'data/local-database-hub-session.json');

/**
 * Read hub Postgres session state from disk.
 */
const readPostgresHubSession = (): PostgresHubSessionFile => {
  const sessionPath = getSessionPath();
  if (!fs.existsSync(sessionPath)) {
    return { startedByHub: [] };
  }

  try {
    const raw = fs.readFileSync(sessionPath, 'utf8');
    const parsed = JSON.parse(raw) as PostgresHubSessionFile;
    return { startedByHub: parsed.startedByHub ?? [] };
  } catch {
    return { startedByHub: [] };
  }
};

/**
 * Persist hub Postgres session state to disk.
 */
const writePostgresHubSession = (session: PostgresHubSessionFile): void => {
  const sessionPath = getSessionPath();
  fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
};

/**
 * Record that the hub started Postgres for a project.
 */
export const markPostgresStartedByHub = (projectId: string, formula: string): void => {
  const session = readPostgresHubSession();
  const startedByHub = session.startedByHub.filter((entry) => entry.projectId !== projectId);
  startedByHub.push({
    projectId,
    formula,
    startedAt: new Date().toISOString(),
  });
  writePostgresHubSession({ startedByHub });
};

/**
 * Remove hub Postgres session tracking for a project.
 */
export const clearPostgresStartedByHub = (projectId: string): void => {
  const session = readPostgresHubSession();
  writePostgresHubSession({
    startedByHub: session.startedByHub.filter((entry) => entry.projectId !== projectId),
  });
};

/**
 * Whether the hub started Postgres for a project in this session.
 */
export const wasPostgresStartedByHub = (projectId: string): boolean =>
  readPostgresHubSession().startedByHub.some((entry) => entry.projectId === projectId);

/**
 * List all hub-started Postgres entries.
 */
export const getHubStartedPostgresEntries = (): HubStartedPostgresEntry[] =>
  readPostgresHubSession().startedByHub;
