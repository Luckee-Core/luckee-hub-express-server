import type { Request, Response } from 'express';

import { processPickLuckeeParentFolder } from '../process-hub-config';

/**
 * POST /api/projects/hub-config/pick-folder — macOS Finder picker, save luckeeParent.
 */
export const pickHubConfigFolderHandler = (_req: Request, res: Response): void => {
  console.log('📥 [projects.pickHubConfigFolderHandler] Request received');
  try {
    const result = processPickLuckeeParentFolder();
    if ('error' in result) {
      const statusCode = result.cancelled ? 400 : 500;
      console.log('📤 [projects.pickHubConfigFolderHandler] Sending response', { statusCode });
      res.status(statusCode).json({ success: false, error: result.error });
      return;
    }

    console.log('✅ [projects.pickHubConfigFolderHandler] Folder selected', {
      luckeeParent: result.luckeeParent,
    });
    res.status(200).json({ success: true, data: { luckeeParent: result.luckeeParent } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to pick folder';
    console.error('❌ [projects.pickHubConfigFolderHandler] Failed', { message });
    res.status(500).json({ success: false, error: message });
  }
};
