import fs from 'fs';
import path from 'path';

import type { HubUiPreferences, ProjectCatalogTier } from './types';
import { getHubRoot, readLocalConfig, writeLocalConfig } from '../../utils/projects';

const CATALOG_TIERS = new Set<ProjectCatalogTier>([
  'active',
  'finalSteps',
  'almostReady',
  'workInProgress',
]);

export type UiPreferencesPatch = {
  favoriteProjectIds?: unknown;
  projectSectionOverrides?: unknown;
};

/** Committed, shared file (not gitignored) — favorites and table sections travel with the repo. */
const getPreferencesPath = (hubRoot: string): string =>
  path.join(hubRoot, 'data', 'ui-preferences.json');

const parseFavoriteIds = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const ids = value.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  return [...new Set(ids)];
};

const parseSectionOverrides = (value: unknown): Record<string, ProjectCatalogTier> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const next: Record<string, ProjectCatalogTier> = {};
  for (const [projectId, tier] of Object.entries(value as Record<string, unknown>)) {
    if (projectId && CATALOG_TIERS.has(tier as ProjectCatalogTier)) {
      next[projectId] = tier as ProjectCatalogTier;
    }
  }
  return next;
};

const normalize = (stored: Partial<HubUiPreferences> | undefined): HubUiPreferences => ({
  favoriteProjectIds: parseFavoriteIds(stored?.favoriteProjectIds) ?? [],
  projectSectionOverrides: parseSectionOverrides(stored?.projectSectionOverrides) ?? {},
});

/**
 * Atomic write with sorted keys so git diffs stay small and stable.
 */
const writePreferencesFile = (hubRoot: string, prefs: HubUiPreferences): void => {
  const sortedOverrides = Object.fromEntries(
    Object.entries(prefs.projectSectionOverrides).sort(([a], [b]) => a.localeCompare(b)),
  );
  const content = {
    favoriteProjectIds: [...prefs.favoriteProjectIds].sort((a, b) => a.localeCompare(b)),
    projectSectionOverrides: sortedOverrides,
  };
  const filePath = getPreferencesPath(hubRoot);
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(content, null, 2)}\n`);
  fs.renameSync(tempPath, filePath);
};

/**
 * Reads data/ui-preferences.json. If it does not exist yet but legacy `uiPreferences` sit in
 * hub.local.json, moves them into the committed file. `null` means nothing has been saved yet.
 */
const readStoredPreferences = (hubRoot: string): HubUiPreferences | null => {
  const filePath = getPreferencesPath(hubRoot);
  if (fs.existsSync(filePath)) {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<HubUiPreferences>;
    return normalize(parsed);
  }

  const localConfig = readLocalConfig(hubRoot);
  if (localConfig.uiPreferences) {
    const legacy = normalize(localConfig.uiPreferences);
    writePreferencesFile(hubRoot, legacy);
    const { uiPreferences: _legacy, ...rest } = localConfig;
    writeLocalConfig(hubRoot, rest);
    console.log('✅ [projects.uiPreferences] Moved uiPreferences from hub.local.json to data/ui-preferences.json');
    return legacy;
  }

  return null;
};

/**
 * Read hub UI preferences (favorites, table section overrides) from data/ui-preferences.json.
 * `stored` is false until preferences have been saved once (lets the web app migrate localStorage).
 */
export const processGetUiPreferences = (): HubUiPreferences & { stored: boolean } => {
  const stored = readStoredPreferences(getHubRoot());
  return { ...(stored ?? normalize(undefined)), stored: stored !== null };
};

/**
 * Merge a partial update into hub UI preferences and persist to data/ui-preferences.json.
 */
export const processPutUiPreferences = (
  patch: UiPreferencesPatch,
): HubUiPreferences | { error: string } => {
  const favoriteProjectIds =
    patch.favoriteProjectIds === undefined ? undefined : parseFavoriteIds(patch.favoriteProjectIds);
  const projectSectionOverrides =
    patch.projectSectionOverrides === undefined
      ? undefined
      : parseSectionOverrides(patch.projectSectionOverrides);

  if (favoriteProjectIds === null) {
    return { error: 'favoriteProjectIds must be an array of project ids' };
  }
  if (projectSectionOverrides === null) {
    return { error: 'projectSectionOverrides must be an object of projectId → tier' };
  }
  if (favoriteProjectIds === undefined && projectSectionOverrides === undefined) {
    return { error: 'Nothing to save' };
  }

  const hubRoot = getHubRoot();
  const current = readStoredPreferences(hubRoot) ?? normalize(undefined);
  const next: HubUiPreferences = {
    favoriteProjectIds: favoriteProjectIds ?? current.favoriteProjectIds,
    projectSectionOverrides: projectSectionOverrides ?? current.projectSectionOverrides,
  };

  writePreferencesFile(hubRoot, next);
  return next;
};
