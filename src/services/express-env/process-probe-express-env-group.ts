import path from 'path';

import { envKeyPresent } from '../../utils/supabase-config/upsert-env-keys';
import { getHubRoot, resolveProjectForExpressEnv } from '../../utils/express-env';
import type { ExpressEnvGroupProbe } from './types';

/**
 * Probe whether express .env has keys for a named group (booleans only).
 */
export const processProbeExpressEnvGroup = (
  projectId: string,
  groupId: string,
): ExpressEnvGroupProbe => {
  console.log('🚀 [express-env.processProbeExpressEnvGroup] Starting probe', {
    projectId,
    groupId,
  });

  const resolved = resolveProjectForExpressEnv(projectId, getHubRoot());
  if (!resolved) {
    return {
      supported: false,
      groupId,
      keysPresent: {},
      configured: false,
      message: 'Express env groups are not configured for this project',
    };
  }

  const group = resolved.expressEnv.groups[groupId];
  if (!group) {
    return {
      supported: false,
      groupId,
      keysPresent: {},
      configured: false,
      message: `Unknown env group: ${groupId}`,
    };
  }

  const expressDir = resolved.merged.expressDir!;
  const expressEnvPath = path.join(path.basename(expressDir), '.env');
  const keysPresent: Record<string, boolean> = {};
  for (const key of group.keys) {
    keysPresent[key] = envKeyPresent(expressDir, key);
  }

  // Optional keys: tracking URL / Gmail from-name can be empty
  const requiredKeys =
    groupId === 'ai'
      ? group.keys.filter((k) => k === 'ANTHROPIC_API_KEY')
      : groupId === 'email'
        ? group.keys.filter(
            (k) => k === 'GMAIL_SEND_AS_EMAIL' || k === 'GMAIL_SERVICE_ACCOUNT_JSON_PATH',
          )
        : group.keys;
  const configured = requiredKeys.every((key) => keysPresent[key]);

  console.log('✅ [express-env.processProbeExpressEnvGroup] Probe complete', {
    projectId,
    groupId,
    configured,
  });

  return {
    supported: true,
    groupId,
    label: group.label,
    expressEnvPath,
    keysPresent,
    configured,
    message: configured
      ? `${group.label} env keys present in express .env`
      : `Add ${group.label} values on this page`,
  };
};
