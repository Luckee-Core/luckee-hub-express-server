import path from 'path';

import {
  checkSupabaseTables,
  envKeyPresent,
  getHubRoot,
  readEnvKey,
  resolveProjectForSupabase,
  type ResolvedProjectForSupabase,
} from '../../utils/supabase-config';
import type { SupabaseProbe } from './types';

const SERVICE_KEY_NAMES = ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY'] as const;

const readServiceKey = (expressDir: string): string | null => {
  for (const name of SERVICE_KEY_NAMES) {
    const value = readEnvKey(expressDir, name);
    if (value) {
      return value;
    }
  }
  return null;
};

export type SupabaseKeyStatus = {
  resolved: ResolvedProjectForSupabase;
  hasSupabaseUrl: boolean;
  hasServiceKey: boolean;
  missingKeys: string[];
  configured: boolean;
};

/**
 * Sync key-presence check (no network). Used by the probe and to gate Run.
 */
export const readSupabaseKeyStatus = (projectId: string): SupabaseKeyStatus | null => {
  const resolved = resolveProjectForSupabase(projectId, getHubRoot());
  if (!resolved) {
    return null;
  }
  const expressDir = resolved.merged.expressDir!;
  const hasSupabaseUrl = envKeyPresent(expressDir, 'SUPABASE_URL');
  const hasServiceKey = SERVICE_KEY_NAMES.some((name) => envKeyPresent(expressDir, name));
  const missingKeys = resolved.supabase.envKeys.filter((key) => !envKeyPresent(expressDir, key));
  return {
    resolved,
    hasSupabaseUrl,
    hasServiceKey,
    missingKeys,
    configured: missingKeys.length === 0,
  };
};

/**
 * Probe Supabase keys in the Express .env and — when they are set — whether the registry's
 * expected tables exist, via the Supabase REST API with the service key.
 */
export const processProbeSupabaseConfig = async (projectId: string): Promise<SupabaseProbe> => {
  console.log('🚀 [supabase-config.processProbeSupabaseConfig] Starting probe', { projectId });

  const status = readSupabaseKeyStatus(projectId);
  if (!status) {
    return {
      supported: false,
      hasSupabaseUrl: false,
      hasServiceKey: false,
      configured: false,
      schemaReady: false,
      message: 'Supabase is not configured for this project',
    };
  }

  const { resolved, hasSupabaseUrl, hasServiceKey, missingKeys, configured } = status;
  const expressDir = resolved.merged.expressDir!;
  const expressEnvPath = path.join(path.basename(expressDir), '.env');
  const bootstrapSql = path.join(path.basename(expressDir), resolved.supabase.bootstrapSql);
  const expectedTables = resolved.supabase.expectedTables;

  let schemaReady = false;
  let missingTables: string[] | undefined;
  let schemaCheckError: string | undefined;

  const supabaseUrl = readEnvKey(expressDir, 'SUPABASE_URL');
  const serviceKey = readServiceKey(expressDir);
  if (supabaseUrl && serviceKey && expectedTables.length > 0) {
    const check = await checkSupabaseTables(supabaseUrl, serviceKey, expectedTables);
    if (check.ok) {
      missingTables = check.missingTables;
      schemaReady = check.missingTables.length === 0;
    } else {
      schemaCheckError = check.error;
    }
  } else if (expectedTables.length === 0) {
    schemaReady = true;
  }

  console.log('✅ [supabase-config.processProbeSupabaseConfig] Probe complete', {
    projectId,
    configured,
    schemaReady,
    missingTables,
  });

  return {
    supported: true,
    expressEnvPath,
    bootstrapSql,
    expectedTables,
    hasSupabaseUrl,
    hasServiceKey,
    configured,
    schemaReady,
    missingTables,
    schemaCheckError,
    message: !configured
      ? `Missing ${missingKeys.join(', ')} in Express .env`
      : schemaCheckError
        ? schemaCheckError
        : schemaReady
          ? 'Supabase keys are set and expected tables exist'
          : `Missing tables: ${(missingTables ?? []).join(', ')}`,
  };
};
