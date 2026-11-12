import fs from 'fs';
import path from 'path';

import type { HubProjectRepoRole } from '../projects/types';
import { filterSectionsByDataPlane } from '../../utils/express-env/filter-sections-by-data-plane';
import { isSecretEnvEntry } from '../../utils/express-env/is-secret-env-entry';
import { parseEnvExample } from '../../utils/express-env/parse-env-example';
import { readEnvFile } from '../../utils/express-env/read-env-file';
import { resolveProjectContext } from '../../utils/express-env/resolve-project-for-env';
import { resolveRepoEnvDir } from '../../utils/express-env/resolve-repo-env-dir';
import { getHubRoot } from '../../utils/express-env/resolve-project-for-env';
import type { ProjectEnvProbe, ProjectEnvSection } from './types';

export type GetProjectEnvInput = {
  projectId: string;
  role: HubProjectRepoRole;
  repoName: string;
};

/**
 * Build env probe for one repo checkout from `.env.example` and `.env`.
 */
export const processGetProjectEnv = (input: GetProjectEnvInput): ProjectEnvProbe => {
  const hubRoot = getHubRoot();
  const ctx = resolveProjectContext(input.projectId, hubRoot);
  if (!ctx) {
    return {
      role: input.role,
      repoName: input.repoName,
      cloned: false,
      sections: [],
      message: 'Project not found',
    };
  }

  const repo = ctx.entry.repos.find((r) => r.repoName === input.repoName && r.role === input.role);
  if (!repo) {
    return {
      role: input.role,
      repoName: input.repoName,
      cloned: false,
      sections: [],
      message: 'Repo not registered for this project',
    };
  }

  const repoDir = resolveRepoEnvDir(
    ctx.entry,
    ctx.merged,
    ctx.luckeeParent,
    input.role,
    input.repoName,
  );
  const cloned = !!(repoDir && fs.existsSync(repoDir));

  if (!cloned || !repoDir) {
    return {
      role: input.role,
      repoName: input.repoName,
      cloned: false,
      sections: [],
      message: 'Repo not cloned — run Setup from Overview',
    };
  }

  const examplePath = path.join(repoDir, '.env.example');
  const envValues = readEnvFile(repoDir);
  const requiredKeys = new Set(ctx.entry.expressEnv?.requiredKeys ?? []);

  let parsed = [{ id: 'general', title: 'General', description: '', keys: [] as ReturnType<typeof parseEnvExample>[0]['keys'] }];
  const exampleKeys = new Set<string>();

  if (fs.existsSync(examplePath)) {
    parsed = parseEnvExample(fs.readFileSync(examplePath, 'utf8'));
    for (const section of parsed) {
      for (const k of section.keys) {
        exampleKeys.add(k.key);
      }
    }
  } else {
    const keys = Object.keys(envValues).map((key) => ({
      key,
      optional: false,
      placeholder: '',
    }));
    parsed = [{ id: 'general', title: 'General', description: '', keys }];
    keys.forEach((k) => exampleKeys.add(k.key));
  }

  const expressDir = ctx.merged?.expressDir;
  const filtered = filterSectionsByDataPlane(parsed, ctx.entry.dataPlane, expressDir);

  const sections: ProjectEnvSection[] = filtered.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    keys: section.keys.map((k) => {
      const value = envValues[k.key] ?? null;
      const secret = isSecretEnvEntry(k.key, value);
      const present = !!value;
      const base = {
        key: k.key,
        secret,
        required: requiredKeys.has(k.key),
        optional: k.optional,
        present,
        placeholder: k.placeholder || undefined,
      };
      if (secret) {
        return base;
      }
      return { ...base, value: value ?? '' };
    }),
  }));

  const otherKeys = Object.keys(envValues).filter((k) => !exampleKeys.has(k));
  if (otherKeys.length > 0) {
    sections.push({
      id: 'other',
      title: 'Other',
      description: 'Keys present in .env but not listed in .env.example',
      keys: otherKeys.map((key) => {
        const value = envValues[key];
        const secret = isSecretEnvEntry(key, value);
        const base = {
          key,
          secret,
          required: false,
          optional: false,
          present: true,
        };
        if (secret) {
          return base;
        }
        return { ...base, value };
      }),
    });
  }

  return {
    role: input.role,
    repoName: input.repoName,
    cloned: true,
    envPath: path.join(repoDir, '.env'),
    sections,
  };
};
