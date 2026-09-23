import fs from 'fs';
import path from 'path';

import type { ProjectRegistryEntry } from '../../services/projects/types';

export type WriteProjectWorkspaceFileResult = 'written' | 'skipped';

type CursorWorkspaceFile = {
  folders: Array<{ path: string }>;
};

/**
 * Write `{projectRoot}/{projectId}.code-workspace` with relative repo folder paths.
 * Skips when the file already exists so hand-edited workspaces are preserved.
 */
export const writeProjectWorkspaceFile = (
  projectRoot: string,
  projectId: string,
  registry: ProjectRegistryEntry,
): WriteProjectWorkspaceFileResult => {
  const workspaceFile = path.join(projectRoot, `${projectId}.code-workspace`);

  if (fs.existsSync(workspaceFile)) {
    return 'skipped';
  }

  const folders = registry.repos.map((repo) => ({
    path: repo.repoName,
  }));

  const payload: CursorWorkspaceFile = { folders };
  fs.writeFileSync(workspaceFile, `${JSON.stringify(payload, null, 2)}\n`);

  return 'written';
};

/**
 * Resolve the default Cursor workspace path for a hub-managed project folder.
 */
export const resolveProjectWorkspaceFilePath = (projectRoot: string, projectId: string): string =>
  path.join(projectRoot, `${projectId}.code-workspace`);
