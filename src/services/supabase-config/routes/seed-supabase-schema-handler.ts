import type { Request, Response } from 'express';

import { processSeedSupabaseSchema } from '../process-seed-supabase-schema';

/**
 * POST /api/projects/:id/supabase/seed-schema — apply bootstrap SQL via DATABASE_URL.
 */
export const seedSupabaseSchemaHandler = (req: Request, res: Response): void => {
  const projectId = String(req.params.id ?? '');
  console.log('📥 [supabase-config.seedSupabaseSchemaHandler] Request received', { projectId });

  try {
    const result = processSeedSupabaseSchema(projectId);

    if ('error' in result) {
      console.log('📤 [supabase-config.seedSupabaseSchemaHandler] Sending response', {
        statusCode: result.status,
      });
      res.status(result.status).json({ success: false, error: result.error });
      return;
    }

    console.log('✅ [supabase-config.seedSupabaseSchemaHandler] Schema seeded', { projectId });
    console.log('📤 [supabase-config.seedSupabaseSchemaHandler] Sending response', {
      statusCode: 200,
    });
    res.status(200).json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Schema seed failed';
    console.error('❌ [supabase-config.seedSupabaseSchemaHandler] Seed failed', {
      projectId,
      message,
    });
    res.status(500).json({ success: false, error: message });
  }
};
