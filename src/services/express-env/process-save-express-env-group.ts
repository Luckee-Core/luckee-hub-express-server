import path from 'path';

import { upsertEnvKeys } from '../../utils/supabase-config/upsert-env-keys';
import { getHubRoot, resolveProjectForExpressEnv } from '../../utils/express-env';
import type { ExpressEnvGroupSaveResult } from './types';

type SaveResult = ExpressEnvGroupSaveResult | { error: string; status: 400 | 500 };

/**
 * Upsert provided env keys for a group into express .env (skips empty values).
 */
export const processSaveExpressEnvGroup = (
  projectId: string,
  groupId: string,
  values: Record<string, string>,
): SaveResult => {
  console.log('🚀 [express-env.processSaveExpressEnvGroup] Saving', { projectId, groupId });

  const resolved = resolveProjectForExpressEnv(projectId, getHubRoot());
  if (!resolved) {
    return { error: 'Express env groups are not configured for this project', status: 400 };
  }

  const group = resolved.expressEnv.groups[groupId];
  if (!group) {
    return { error: `Unknown env group: ${groupId}`, status: 400 };
  }

  const allowed = new Set(group.keys);
  const toWrite: Record<string, string> = {};
  for (const [key, raw] of Object.entries(values)) {
    if (!allowed.has(key)) {
      return { error: `Key not allowed for group ${groupId}: ${key}`, status: 400 };
    }
    const value = raw.trim();
    if (value) {
      toWrite[key] = value;
    }
  }

  if (Object.keys(toWrite).length === 0) {
    return { error: 'Provide at least one non-empty value to save', status: 400 };
  }

  const expressDir = resolved.merged.expressDir!;
  const envPath = upsertEnvKeys(expressDir, toWrite);
  const relativePath = path.join(path.basename(expressDir), '.env');

  console.log('✅ [express-env.processSaveExpressEnvGroup] Wrote .env', {
    projectId,
    groupId,
    envPath,
    keys: Object.keys(toWrite),
  });

  return {
    success: true,
    message: `Wrote ${Object.keys(toWrite).join(', ')} to ${relativePath}`,
    expressEnvPath: relativePath,
  };
};
