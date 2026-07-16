import type { Request, Response } from 'express';

import { processPutHubConfig } from '../process-hub-config';

type PutHubConfigBody = {
  luckeeParent?: string;
};

/**
 * PUT /api/projects/hub-config — set luckeeParent.
 */
export const putHubConfigHandler = (req: Request, res: Response): void => {
  const body = req.body as PutHubConfigBody;
  const luckeeParent = typeof body.luckeeParent === 'string' ? body.luckeeParent.trim() : '';

  console.log('📥 [projects.putHubConfigHandler] Request received');
  try {
    const result = processPutHubConfig(luckeeParent);
    if ('error' in result) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    console.log('✅ [projects.putHubConfigHandler] Hub config saved');
    res.status(200).json({ success: true, data: { luckeeParent } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save hub config';
    console.error('❌ [projects.putHubConfigHandler] Failed', { message });
    res.status(500).json({ success: false, error: message });
  }
};
