import fs from 'fs';
import path from 'path';

import type { ProjectLocalEntry } from '../../services/projects/types';

const listWorkspaceFilesInDir = (dir: string): string[] => {
  if (!dir || !fs.existsSync(dir)) {
    return [];
  }

  try {
    return fs
      .readdirSync(dir)
      .filter((name) => name.endsWith('.code-workspace'))
      .map((name) => path.join(dir, name));
  } catch {
    return [];
  }
};

const collectSearchDirs = (local: ProjectLocalEntry): string[] => {
  const dirs = new Set<string>();
  for (const dir of [local.webDir, local.expressDir]) {
    if (!dir) {
      continue;
    }
    dirs.add(dir);
    dirs.add(path.dirname(dir));
  }
  return [...dirs];
};

const workspaceMatchesRepoDir = (workspaceFile: string, repoDir: string): boolean => {
  const workspaceStem = path.basename(workspaceFile, '.code-workspace');
  const repoName = path.basename(repoDir);
  return workspaceStem === repoName || workspaceStem.includes(repoName) || repoName.includes(workspaceStem);
};

/**
 * Resolve Cursor workspace file for a hooked-up project.
 * Uses explicit workspaceFile when present; otherwise discovers a sibling
 * `.code-workspace` beside webDir/expressDir or their parent folder.
 */
export const resolveProjectWorkspaceFile = (local: ProjectLocalEntry): string | undefined => {
  const configured = local.workspaceFile?.trim();
  if (configured && fs.existsSync(configured)) {
    return configured;
  }

  const candidates = collectSearchDirs(local).flatMap((dir) => listWorkspaceFilesInDir(dir));
  if (candidates.length === 0) {
    return undefined;
  }

  const repoDirs = [local.webDir, local.expressDir].filter(Boolean) as string[];
  const matched = candidates.filter((candidate) =>
    repoDirs.some((repoDir) => workspaceMatchesRepoDir(candidate, repoDir)),
  );

  if (matched.length === 1) {
    return matched[0];
  }

  if (matched.length > 1) {
    const sharedParent =
      local.webDir && local.expressDir && path.dirname(local.webDir) === path.dirname(local.expressDir)
        ? path.dirname(local.webDir)
        : undefined;

    if (sharedParent) {
      const inSharedParent = matched.filter((candidate) => path.dirname(candidate) === sharedParent);
      if (inSharedParent.length === 1) {
        return inSharedParent[0];
      }
    }

    return matched[0];
  }

  return undefined;
};
