import { Request, Response } from 'express';

import { processRunStudio } from '../process-run-studio';

/**
 * POST /api/launcher/studios/:id/run — spawn studio dev servers.
 */
export const runStudioHandler = (req: Request, res: Response): void => {
  try {
    const studioId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!studioId) {
      res.status(400).json({ success: false, error: 'Studio id required' });
      return;
    }

    const result = processRunStudio(studioId);
    if (!result) {
      res.status(400).json({ success: false, error: 'Studio not configured' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        jobId: result.jobId,
        sessions: result.sessions ?? [],
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ runStudioHandler:', message);
    res.status(500).json({ success: false, error: message });
  }
};
