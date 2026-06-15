import type { Request, Response } from 'express';

import { processRunLocalDatabaseStep } from '../process-run-local-database-step';

/**
 * POST /api/projects/:id/local-database/steps/:stepId/run — run one setup step.
 */
export const runLocalDatabaseStepHandler = async (req: Request, res: Response) => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const stepId = Array.isArray(req.params.stepId) ? req.params.stepId[0] : req.params.stepId;

  if (!projectId) {
    return res.status(400).json({ success: false, error: 'Project id required' });
  }
  if (!stepId) {
    return res.status(400).json({ success: false, error: 'Step id required' });
  }

  console.log('📥 [local-database.runLocalDatabaseStepHandler] Request received', {
    projectId,
    stepId,
  });

  try {
    const result = processRunLocalDatabaseStep(projectId, stepId);
    if ('error' in result) {
      console.log('📤 [local-database.runLocalDatabaseStepHandler] Sending response', {
        statusCode: result.status,
      });
      return res.status(result.status).json({ success: false, error: result.error });
    }

    console.log('✅ [local-database.runLocalDatabaseStepHandler] Step complete', { projectId, stepId });
    console.log('📤 [local-database.runLocalDatabaseStepHandler] Sending response', { statusCode: 200 });
    return res.status(200).json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to run setup step';
    console.error('❌ [local-database.runLocalDatabaseStepHandler] Step failed', {
      projectId,
      stepId,
      message,
    });
    return res.status(500).json({ success: false, error: message });
  }
};
