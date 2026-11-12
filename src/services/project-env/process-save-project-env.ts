import { upsertEnvKeys } from '../../utils/supabase-config/upsert-env-keys';
import { resolveProjectContext, getHubRoot } from '../../utils/express-env/resolve-project-for-env';
import { resolveRepoEnvDir } from '../../utils/express-env/resolve-repo-env-dir';
import { processGetProjectEnv } from './process-get-project-env';
import type { HubProjectRepoRole } from '../projects/types';
import type { ProjectEnvSaveResult } from './types';

export type SaveProjectEnvInput = {
  projectId: string;
  role: HubProjectRepoRole;
  repoName: string;
  values: Record<string, string>;
};

/**
 * Upsert env keys for one repo and return an updated probe.
 */
export const processSaveProjectEnv = (input: SaveProjectEnvInput): ProjectEnvSaveResult => {
  const probeBefore = processGetProjectEnv(input);
  if (!probeBefore.cloned) {
    return { success: false, message: probeBefore.message ?? 'Repo not available', probe: probeBefore };
  }

  const hubRoot = getHubRoot();
  const ctx = resolveProjectContext(input.projectId, hubRoot);
  if (!ctx?.merged) {
    return { success: false, message: 'Project not configured in hub.local.json', probe: probeBefore };
  }

  const repoDir = resolveRepoEnvDir(
    ctx.entry,
    ctx.merged,
    ctx.luckeeParent,
    input.role,
    input.repoName,
  );
  if (!repoDir) {
    return { success: false, message: 'Could not resolve repo directory', probe: probeBefore };
  }

  const allowedKeys = new Set(probeBefore.sections.flatMap((s) => s.keys.map((k) => k.key)));
  const toWrite: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.values)) {
    if (!value.trim()) {
      continue;
    }
    if (!allowedKeys.has(key)) {
      return {
        success: false,
        message: `Key not allowed: ${key}`,
        probe: probeBefore,
      };
    }
    toWrite[key] = value.trim();
  }

  if (Object.keys(toWrite).length === 0) {
    return { success: false, message: 'Enter at least one value to save', probe: probeBefore };
  }

  upsertEnvKeys(repoDir, toWrite);
  const probe = processGetProjectEnv(input);
  return {
    success: true,
    message: 'Saved',
    probe,
  };
};
