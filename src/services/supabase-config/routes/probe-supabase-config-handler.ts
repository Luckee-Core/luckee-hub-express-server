import type { Request, Response } from 'express';

import { processProbeSupabaseConfig } from '../process-probe-supabase-config';

/**
 * GET /api/projects/:id/supabase — probe Supabase env presence in express .env.
 */
export const probeSupabaseConfigHandler = (req: Request, res: Response): void => {
  const projectId = String(req.params.id ?? '');
  console.log('📥 [supabase-config.probeSupabaseConfigHandler] Request received', { projectId });

  try {
    const probe = processProbeSupabaseConfig(projectId);
    console.log('✅ [supabase-config.probeSupabaseConfigHandler] Probe complete', { projectId });
    console.log('📤 [supabase-config.probeSupabaseConfigHandler] Sending response', {
      statusCode: 200,
    });
    res.status(200).json({ success: true, data: probe });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Probe failed';
    console.error('❌ [supabase-config.probeSupabaseConfigHandler] Probe failed', {
      projectId,
      message,
    });
    res.status(500).json({ success: false, error: message });
  }
};
