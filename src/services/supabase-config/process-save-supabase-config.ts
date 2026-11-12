import path from 'path';

import {
  extractSupabaseProjectRef,
  getHubRoot,
  resolveProjectForSupabase,
  upsertEnvKeys,
} from '../../utils/supabase-config';
import type { SupabaseConfigSaveInput, SupabaseConfigSaveResult } from './types';

type SaveResult =
  | SupabaseConfigSaveResult
  | { error: string; status: 400 | 500 };

/**
 * Upsert SUPABASE_URL and the service role key into the project's express .env.
 * The key is written under the name the registry expects (SUPABASE_SERVICE_ROLE_KEY by default,
 * SUPABASE_SERVICE_KEY when that is what `supabase.envKeys` lists). DATABASE_URL is not touched —
 * it belongs to local Postgres / storage.
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

  if (!supabaseUrl || !serviceKey) {
    return { error: 'supabaseUrl and serviceKey are required', status: 400 };
  }

  if (!extractSupabaseProjectRef(supabaseUrl)) {
    return {
      error: 'Check the Supabase project URL format (https://{ref}.supabase.co)',
      status: 400,
    };
  }

  const serviceKeyName = resolved.supabase.envKeys.includes('SUPABASE_SERVICE_KEY')
    ? 'SUPABASE_SERVICE_KEY'
    : 'SUPABASE_SERVICE_ROLE_KEY';

  const expressDir = resolved.merged.expressDir!;
  const envPath = upsertEnvKeys(expressDir, {
    SUPABASE_URL: supabaseUrl,
    [serviceKeyName]: serviceKey,
  });

  const relativePath = path.join(path.basename(expressDir), '.env');
  console.log('✅ [supabase-config.processSaveSupabaseConfig] Wrote .env', {
    projectId,
    envPath,
    serviceKeyName,
  });

  return {
    success: true,
    message: `Wrote Supabase keys to ${relativePath}`,
    expressEnvPath: relativePath,
  };
};
