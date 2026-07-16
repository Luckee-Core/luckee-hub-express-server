import type { Request, Response } from 'express';

import { processGetHubConfig } from '../process-hub-config';

/**
 * GET /api/projects/hub-config — read luckeeParent and githubOrg.
 */
export const getHubConfigHandler = (_req: Request, res: Response): void => {
  console.log('📥 [projects.getHubConfigHandler] Request received');
  try {
    const data = processGetHubConfig();
    console.log('✅ [projects.getHubConfigHandler] Hub config loaded');
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to read hub config';
    console.error('❌ [projects.getHubConfigHandler] Failed', { message });
    res.status(500).json({ success: false, error: message });
  }
};
