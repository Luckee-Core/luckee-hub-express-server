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
  activeConsumers: string[];
};

const getSessionPath = (): string =>
  path.join(getHubRoot(), 'data/local-database-hub-session.json');

/**
 * Read hub Postgres session state from disk.
 */
const readPostgresHubSession = (): PostgresHubSessionFile => {
  const sessionPath = getSessionPath();
  if (!fs.existsSync(sessionPath)) {
    return { startedByHub: [], activeConsumers: [] };
  }

  try {
    const raw = fs.readFileSync(sessionPath, 'utf8');
    const parsed = JSON.parse(raw) as PostgresHubSessionFile;
    return {
      startedByHub: parsed.startedByHub ?? [],
      activeConsumers: parsed.activeConsumers ?? [],
    };
  } catch {
    return { startedByHub: [], activeConsumers: [] };
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
  writePostgresHubSession({ ...session, startedByHub });
};

/**
 * Remove hub Postgres session tracking for a project.
 */
export const clearPostgresStartedByHub = (projectId: string): void => {
  const session = readPostgresHubSession();
  writePostgresHubSession({
    ...session,
    startedByHub: session.startedByHub.filter((entry) => entry.projectId !== projectId),
  });
};

/**
 * Clear all hub-started Postgres entries (after Postgres is stopped).
 */
export const clearAllPostgresStartedByHub = (): void => {
  const session = readPostgresHubSession();
  writePostgresHubSession({ ...session, startedByHub: [] });
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

/**
 * Register a project as an active local-database consumer (Run).
 */
export const addPostgresConsumer = (projectId: string): void => {
  const session = readPostgresHubSession();
  if (session.activeConsumers.includes(projectId)) {
    return;
  }
  writePostgresHubSession({
    ...session,
    activeConsumers: [...session.activeConsumers, projectId],
  });
};

/**
 * Remove a project from active local-database consumers (Close / cleanup).
 */
export const removePostgresConsumer = (projectId: string): void => {
  const session = readPostgresHubSession();
  writePostgresHubSession({
    ...session,
    activeConsumers: session.activeConsumers.filter((id) => id !== projectId),
  });
};

/**
 * Clear all active local-database consumers.
 */
export const clearAllPostgresConsumers = (): void => {
  const session = readPostgresHubSession();
  writePostgresHubSession({ ...session, activeConsumers: [] });
};

/**
 * Whether a project is registered as an active local-database consumer.
 */
export const isPostgresConsumer = (projectId: string): boolean =>
  readPostgresHubSession().activeConsumers.includes(projectId);

/**
 * Count of active local-database consumers.
 */
export const getPostgresConsumerCount = (): number =>
  readPostgresHubSession().activeConsumers.length;

/**
 * Whether any local-database project is still running.
 */
export const hasPostgresConsumers = (): boolean => getPostgresConsumerCount() > 0;

/**
 * Whether Postgres should be stopped after removing a consumer.
 */
export const shouldStopPostgresAfterClose = (): boolean => {
  const session = readPostgresHubSession();
  return session.activeConsumers.length === 0 && session.startedByHub.length > 0;
};
