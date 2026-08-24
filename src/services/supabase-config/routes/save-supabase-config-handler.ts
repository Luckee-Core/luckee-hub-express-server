import type { Request, Response } from 'express';

import { processSaveSupabaseConfig } from '../process-save-supabase-config';

/**
 * POST /api/projects/:id/supabase/config — upsert Supabase keys into express .env.
 */
export const saveSupabaseConfigHandler = (req: Request, res: Response): void => {
  const projectId = String(req.params.id ?? '');
  console.log('📥 [supabase-config.saveSupabaseConfigHandler] Request received', { projectId });

  try {
    const result = processSaveSupabaseConfig(projectId, {
      supabaseUrl: String(req.body?.supabaseUrl ?? ''),
      serviceKey: String(req.body?.serviceKey ?? ''),
      databasePassword: String(req.body?.databasePassword ?? ''),
    });

    if ('error' in result) {
      console.log('📤 [supabase-config.saveSupabaseConfigHandler] Sending response', {
        statusCode: result.status,
      });
      res.status(result.status).json({ success: false, error: result.error });
      return;
    }

    console.log('✅ [supabase-config.saveSupabaseConfigHandler] Config saved', { projectId });
    console.log('📤 [supabase-config.saveSupabaseConfigHandler] Sending response', {
      statusCode: 200,
    });
    res.status(200).json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Save failed';
    console.error('❌ [supabase-config.saveSupabaseConfigHandler] Save failed', {
      projectId,
      message,
    });
    res.status(500).json({ success: false, error: message });
  }
};
