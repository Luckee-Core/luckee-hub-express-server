import type { Request, Response } from 'express';

import { processSetDataPlane } from '../process-set-data-plane';

/**
 * POST /api/projects/:id/data-plane — set mode option.
 */
export const postDataPlaneHandler = async (req: Request, res: Response) => {
  const projectId = String(req.params.id);
  const optionId = String((req.body as { optionId?: string }).optionId ?? '');

  console.log('📥 [project-env.postDataPlaneHandler]', { projectId, optionId });

  if (!optionId) {
    return res.status(400).json({ success: false, error: 'optionId is required' });
  }

  try {
    const result = processSetDataPlane(projectId, optionId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.message });
    }
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [project-env.postDataPlaneHandler]', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Set failed',
    });
  }
};
