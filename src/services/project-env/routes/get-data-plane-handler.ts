import type { Request, Response } from 'express';

import { processGetDataPlane } from '../process-get-data-plane';

/**
 * GET /api/projects/:id/data-plane
 */
export const getDataPlaneHandler = async (req: Request, res: Response) => {
  const projectId = String(req.params.id);
  console.log('📥 [project-env.getDataPlaneHandler]', { projectId });

  try {
    const data = processGetDataPlane(projectId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('❌ [project-env.getDataPlaneHandler]', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Probe failed',
    });
  }
};
