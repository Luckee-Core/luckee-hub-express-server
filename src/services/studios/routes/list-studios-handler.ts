import { Request, Response } from 'express';

import { processListStudios } from '../process-list-studios';

/**
 * GET /api/studios — list studios with hook status.
 */
export const listStudiosHandler = (req: Request, res: Response): void => {
  try {
    const liveParam = req.query.live;
    const liveProbe = liveParam === '1' || liveParam === 'true';
    const studios = processListStudios({ liveProbe });
    res.status(200).json({ success: true, data: studios });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ listStudiosHandler:', message);
    res.status(500).json({ success: false, error: message });
  }
};
