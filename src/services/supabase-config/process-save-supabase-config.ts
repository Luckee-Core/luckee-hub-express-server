import path from 'path';

import {
  buildSupabaseDatabaseUrl,
  getHubRoot,
  resolveProjectForSupabase,
  upsertEnvKeys,
} from '../../utils/supabase-config';
import type { SupabaseConfigSaveInput, SupabaseConfigSaveResult } from './types';

type SaveResult =
  | SupabaseConfigSaveResult
  | { error: string; status: 400 | 500 };

/**
 * Upsert SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_DATABASE_PASSWORD, and DATABASE_URL
 * into the project's express .env.
 */
export const processSaveSupabaseConfig = (
  projectId: string,
  input: SupabaseConfigSaveInput,
): SaveResult => {
  console.log('🚀 [supabase-config.processSaveSupabaseConfig] Saving config', { projectId });

  const resolved = resolveProjectForSupabase(projectId, getHubRoot());
  if (!resolved) {
    return { error: 'Supabase is not configured for this project', status: 400 };
  }

  const supabaseUrl = input.supabaseUrl?.trim() ?? '';
  const serviceKey = input.serviceKey?.trim() ?? '';
  const databasePassword = input.databasePassword?.trim() ?? '';

  if (!supabaseUrl || !serviceKey || !databasePassword) {
    return {
      error: 'supabaseUrl, serviceKey, and databasePassword are required',
      status: 400,
    };
  }

  const databaseUrl = buildSupabaseDatabaseUrl(supabaseUrl, databasePassword);
  if (!databaseUrl) {
    return {
      error: 'Could not build DATABASE_URL — check the Supabase project URL format (https://{ref}.supabase.co)',
      status: 400,
    };
  }

  const expressDir = resolved.merged.expressDir!;
  const envPath = upsertEnvKeys(expressDir, {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_KEY: serviceKey,
    SUPABASE_DATABASE_PASSWORD: databasePassword,
    DATABASE_URL: databaseUrl,
  });

  const relativePath = path.join(path.basename(expressDir), '.env');
  console.log('✅ [supabase-config.processSaveSupabaseConfig] Wrote .env', {
    projectId,
    envPath,
  });

  return {
    success: true,
    message: `Wrote Supabase keys to ${relativePath}`,
    expressEnvPath: relativePath,
  };
};
