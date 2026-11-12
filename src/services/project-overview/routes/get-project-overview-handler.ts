import type { Request, Response } from 'express';

import { processGetProjectOverview } from '../process-get-project-overview';

/**
 * GET /api/projects/:id/overview — hand-written project overview, or `data: null` when none exists.
 */
export const getProjectOverviewHandler = (req: Request, res: Response): void => {
  const projectId = String(req.params.id ?? '');
  console.log('📥 [project-overview.getProjectOverviewHandler] Request received', { projectId });

  try {
    const overview = processGetProjectOverview(projectId);
    console.log('📤 [project-overview.getProjectOverviewHandler] Sending response', {
      statusCode: 200,
      found: overview !== null,
    });
    res.status(200).json({ success: true, data: overview });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to read overview';
    console.error('❌ [project-overview.getProjectOverviewHandler]', { projectId, message });
    res.status(500).json({ success: false, error: message });
  }
};
