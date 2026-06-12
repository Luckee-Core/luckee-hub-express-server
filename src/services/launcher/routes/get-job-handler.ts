import { Request, Response } from 'express';

import { processGetJob } from '../process-get-job';

/**
 * GET /api/launcher/jobs/:jobId — poll async run job status.
 */
export const getJobHandler = (req: Request, res: Response): void => {
  try {
    const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
    if (!jobId) {
      res.status(400).json({ success: false, error: 'Job id required' });
      return;
    }

    const job = processGetJob(jobId);
    if (!job) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }

    res.status(200).json({ success: true, data: job });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ getJobHandler:', message);
    res.status(500).json({ success: false, error: message });
  }
};
