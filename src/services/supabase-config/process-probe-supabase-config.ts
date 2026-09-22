import path from 'path';

import {
  envKeyPresent,
  getHubRoot,
  readEnvKey,
  resolveProjectForSupabase,
  supabaseExpectedTablesExist,
} from '../../utils/supabase-config';
import type { SupabaseProbe } from './types';

/**
 * Probe whether Lead Studio (or other) Express .env has required Supabase keys,
 * and whether expected tables exist when DATABASE_URL is present.
 */
export const processProbeSupabaseConfig = (projectId: string): SupabaseProbe => {
  console.log('🚀 [supabase-config.processProbeSupabaseConfig] Starting probe', { projectId });

  const resolved = resolveProjectForSupabase(projectId, getHubRoot());
  if (!resolved) {
    return {
      supported: false,
      hasSupabaseUrl: false,
      hasServiceKey: false,
      hasDatabaseUrl: false,
      configured: false,
      schemaReady: false,
      message: 'Supabase is not configured for this project',
    };
  }

  const expressDir = resolved.merged.expressDir!;
  const expressEnvPath = path.join(path.basename(expressDir), '.env');
  const bootstrapSql = path.join(path.basename(expressDir), resolved.supabase.bootstrapSql);
  const expectedTables = resolved.supabase.expectedTables;

  const hasSupabaseUrl = envKeyPresent(expressDir, 'SUPABASE_URL');
  const hasServiceKey = envKeyPresent(expressDir, 'SUPABASE_SERVICE_KEY');
  const hasDatabaseUrl = envKeyPresent(expressDir, 'DATABASE_URL');
  const configured = hasSupabaseUrl && hasServiceKey && hasDatabaseUrl;

  let schemaReady = false;
  if (hasDatabaseUrl && expectedTables.length > 0) {
    const databaseUrl = readEnvKey(expressDir, 'DATABASE_URL');
    if (databaseUrl) {
      schemaReady = supabaseExpectedTablesExist(databaseUrl, expectedTables);
    }
  }

  console.log('✅ [supabase-config.processProbeSupabaseConfig] Probe complete', {
    projectId,
    configured,
    schemaReady,
  });

  return {
    supported: true,
    expressEnvPath,
    bootstrapSql,
    expectedTables,
    hasSupabaseUrl,
    hasServiceKey,
    hasDatabaseUrl,
    configured,
    schemaReady,
    message: configured
      ? schemaReady
        ? 'Supabase env keys and expected tables are present'
        : 'Supabase env keys are present — seed the table schema if needed'
      : 'Add Supabase URL, service role key, and database password on this page',
  };
};
