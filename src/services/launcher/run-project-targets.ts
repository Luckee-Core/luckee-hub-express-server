import {
  projectHasExpressRepo,
  projectHasNextjsRepo,
} from '../../utils/projects';
import type { ProjectRegistryEntry } from '../projects/types';

export type ProjectRunTarget = 'express' | 'web';

/**
 * Resolve which dev servers to start for a Run request.
 */
export const resolveRunTargets = (
  entry: ProjectRegistryEntry,
  requested?: ProjectRunTarget[] | null,
): ProjectRunTarget[] | { error: string } => {
  const available: ProjectRunTarget[] = [];
  if (projectHasExpressRepo(entry)) {
    available.push('express');
  }
  if (projectHasNextjsRepo(entry)) {
    available.push('web');
  }

  if (available.length === 0) {
    return { error: 'Project has no Express or Web repo' };
  }

  if (!requested || requested.length === 0) {
    return available;
  }

  const unique = [...new Set(requested)];
  for (const target of unique) {
    if (!available.includes(target)) {
      return { error: `Project has no ${target} repo` };
    }
  }

  return unique;
};

/**
 * Parse and validate `targets` from a launcher Run POST body.
 */
export const parseRunTargetsFromBody = (
  body: unknown,
): ProjectRunTarget[] | undefined | { error: string } => {
  if (body == null || typeof body !== 'object') {
    return undefined;
  }

  const raw = (body as { targets?: unknown }).targets;
  if (raw === undefined) {
    return undefined;
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: 'targets must be a non-empty array' };
  }

  const parsed: ProjectRunTarget[] = [];
  for (const item of raw) {
    if (item !== 'express' && item !== 'web') {
      return { error: 'targets may only include express and web' };
    }
    parsed.push(item);
  }

  return [...new Set(parsed)];
};

export const runTargetsInclude = (
  targets: ProjectRunTarget[],
  target: ProjectRunTarget,
): boolean => targets.includes(target);
