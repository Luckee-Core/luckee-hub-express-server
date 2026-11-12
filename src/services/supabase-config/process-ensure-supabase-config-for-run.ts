import { readSupabaseKeyStatus } from './process-probe-supabase-config';

type EnsureResult =
  | { success: true; message: string }
  | { error: string; status: 400 | 500 };

/**
 * Block Run when the project requires Supabase env and keys are missing.
 */
export const processEnsureSupabaseConfigForRun = (projectId: string): EnsureResult => {
  const status = readSupabaseKeyStatus(projectId);
  if (!status) {
    return { success: true, message: 'No Supabase config required' };
  }

  console.log('🚀 [supabase-config.processEnsureSupabaseConfigForRun] Checking env', {
    projectId,
  });

  if (status.configured) {
    console.log('✅ [supabase-config.processEnsureSupabaseConfigForRun] Configured', {
      projectId,
    });
    return { success: true, message: 'Supabase env is configured' };
  }

  console.error('❌ [supabase-config.processEnsureSupabaseConfigForRun] Incomplete', {
    projectId,
  });
  return {
    error: `Missing ${status.missingKeys.join(', ')} in Express .env`,
    status: 400,
  };
};
