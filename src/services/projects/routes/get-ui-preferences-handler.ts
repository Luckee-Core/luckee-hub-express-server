import type { Request, Response } from 'express';

import { processGetUiPreferences } from '../process-ui-preferences';

/**
 * GET /api/projects/ui-preferences — favorites and table section overrides.
 */
export const getUiPreferencesHandler = (_req: Request, res: Response): void => {
  console.log('📥 [projects.getUiPreferencesHandler] Request received');
  try {
    const data = processGetUiPreferences();
    console.log('✅ [projects.getUiPreferencesHandler] UI preferences loaded');
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to read UI preferences';
    console.error('❌ [projects.getUiPreferencesHandler] Failed', { message });
    res.status(500).json({ success: false, error: message });
  }
};
