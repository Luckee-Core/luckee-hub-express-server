import type { ProjectRegistryEntry, ProjectRegistryRepoEntry } from '../../services/projects/types';

/**
 * Express repo row from a project registry entry.
 */
export const getExpressRegistryRepo = (
  entry: ProjectRegistryEntry,
): ProjectRegistryRepoEntry | undefined =>
  entry.repos.find((repo) => repo.repoType === 'express');

/**
 * Next.js repo row from a project registry entry.
 */
export const getNextjsRegistryRepo = (
  entry: ProjectRegistryEntry,
): ProjectRegistryRepoEntry | undefined =>
  entry.repos.find((repo) => repo.repoType === 'nextjs');

/**
 * Whether the project catalog includes an Express repo.
 */
export const projectHasExpressRepo = (entry: ProjectRegistryEntry): boolean =>
  !!getExpressRegistryRepo(entry);

/**
 * Whether the project catalog includes a Next.js repo.
 */
export const projectHasNextjsRepo = (entry: ProjectRegistryEntry): boolean =>
  !!getNextjsRegistryRepo(entry);
