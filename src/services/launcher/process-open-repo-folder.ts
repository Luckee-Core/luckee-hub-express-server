import { spawnSync } from 'child_process';
import fs from 'fs';

import type { HubProjectRepoRole } from '../projects/types';
import { resolveRepoEnvDir } from '../../utils/express-env/resolve-repo-env-dir';
import { getHubRoot, resolveProjectContext } from '../../utils/express-env/resolve-project-for-env';

export type OpenRepoFolderResult = { ok: true; dir: string } | { ok: false; error: string };

/**
 * Reveal one repo checkout in Finder. The path is resolved server-side from the registry and
 * hub.local.json — the client only names the repo, never a filesystem path.
 */
export const processOpenRepoFolder = (
  projectId: string,
  role: HubProjectRepoRole,
  repoName: string,
): OpenRepoFolderResult => {
  const ctx = resolveProjectContext(projectId, getHubRoot());
  if (!ctx) {
    return { ok: false, error: 'Project not found' };
  }

  const repo = ctx.entry.repos.find((r) => r.repoName === repoName && r.role === role);
  if (!repo) {
    return { ok: false, error: 'Repo not registered for this project' };
  }

  const dir = resolveRepoEnvDir(ctx.entry, ctx.merged, ctx.luckeeParent, role, repoName);
  if (!dir || !fs.existsSync(dir)) {
    return { ok: false, error: 'Repo not cloned' };
  }

  const result = spawnSync('open', [dir], { stdio: 'ignore' });
  if (result.status !== 0) {
    return { ok: false, error: 'Could not open Finder' };
  }

  return { ok: true, dir };
};
