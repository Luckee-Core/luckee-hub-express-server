import { processProbeSupabaseConfig } from './process-probe-supabase-config';
import { getHubRoot, resolveProjectForSupabase } from '../../utils/supabase-config';

type EnsureResult =
  | { success: true; message: string }
  | { error: string; status: 400 | 500 };

/**
 * Block Run when the project requires Supabase env and keys are missing.
 */
export const processEnsureSupabaseConfigForRun = (projectId: string): EnsureResult => {
  const resolved = resolveProjectForSupabase(projectId, getHubRoot());
  if (!resolved) {
    return { success: true, message: 'No Supabase config required' };
  }

  console.log('🚀 [supabase-config.processEnsureSupabaseConfigForRun] Checking env', {
    projectId,
  });

  const probe = processProbeSupabaseConfig(projectId);
  if (probe.configured) {
    console.log('✅ [supabase-config.processEnsureSupabaseConfigForRun] Configured', {
      projectId,
    });
    return { success: true, message: 'Supabase env is configured' };
  }

  console.error('❌ [supabase-config.processEnsureSupabaseConfigForRun] Incomplete', {
    projectId,
  });
  return {
    error:
      'Supabase env is incomplete — add URL, service role key, and database password on the project detail page',
    status: 400,
  };
};
