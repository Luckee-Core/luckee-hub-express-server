import { Request, Response } from 'express';

import { processGetJob } from '../process-get-job';

/**
 * GET /api/launcher/jobs/:jobId — poll async run job status.
 */
export const getJobHandler = (req: Request, res: Response): void => {
  const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  if (!jobId) {
    res.status(400).json({ success: false, error: 'Job id required' });
    return;
  }

  console.log('📥 [launcher.getJobHandler] Request received', { jobId });
  try {
    const job = processGetJob(jobId);
    if (!job) {
      console.log('📤 [launcher.getJobHandler] Sending response', { statusCode: 400 });
      res.status(400).json({ success: false, error: 'Job not found' });
      return;
    }

    console.log('✅ [launcher.getJobHandler] Job loaded', { jobId, status: job.status });
    console.log('📤 [launcher.getJobHandler] Sending response', { statusCode: 200 });
    res.status(200).json({ success: true, data: job });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [launcher.getJobHandler] Failed to get job', { jobId, message });
    res.status(500).json({ success: false, error: message });
  }
};
