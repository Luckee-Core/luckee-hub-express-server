import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

export type CloneGitRepoResult = 'cloned' | 'skipped';

/**
 * Clone a public git repo into destDir; skip when `.git` already exists.
 */
export const cloneGitRepo = (repoUrl: string, destDir: string): CloneGitRepoResult => {
  const gitDir = path.join(destDir, '.git');
  if (fs.existsSync(gitDir)) {
    return 'skipped';
  }

  if (fs.existsSync(destDir)) {
    const entries = fs.readdirSync(destDir);
    if (entries.length > 0) {
      throw new Error(`Target directory exists but is not a git repo: ${destDir}`);
    }
  } else {
    fs.mkdirSync(path.dirname(destDir), { recursive: true });
  }

  const cloneUrl = repoUrl.endsWith('.git') ? repoUrl : `${repoUrl}.git`;
  const result = spawnSync('git', ['clone', cloneUrl, destDir], { encoding: 'utf8' });
  if (result.status !== 0) {
    const message = result.stderr?.trim() || result.stdout?.trim() || `git clone failed for ${repoUrl}`;
    throw new Error(message);
  }

  return 'cloned';
};
