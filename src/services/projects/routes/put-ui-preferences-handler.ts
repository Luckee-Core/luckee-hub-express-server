import type { Request, Response } from 'express';

import { processPutUiPreferences, type UiPreferencesPatch } from '../process-ui-preferences';

/**
 * PUT /api/projects/ui-preferences — merge favorites and/or section overrides into data/ui-preferences.json (committed).
 */
export const putUiPreferencesHandler = (req: Request, res: Response): void => {
  const body = (req.body ?? {}) as UiPreferencesPatch;

  console.log('📥 [projects.putUiPreferencesHandler] Request received');
  try {
    const result = processPutUiPreferences(body);
    if ('error' in result) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    console.log('✅ [projects.putUiPreferencesHandler] UI preferences saved', {
      favorites: result.favoriteProjectIds.length,
      sectionOverrides: Object.keys(result.projectSectionOverrides).length,
    });
    res.status(200).json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save UI preferences';
    console.error('❌ [projects.putUiPreferencesHandler] Failed', { message });
    res.status(500).json({ success: false, error: message });
  }
};
