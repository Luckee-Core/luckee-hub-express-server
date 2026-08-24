import type { Request, Response } from 'express';

import { processProbeExpressEnvGroup } from '../process-probe-express-env-group';

/**
 * GET /api/projects/:id/express-env/:groupId — probe key presence (booleans only).
 */
export const probeExpressEnvGroupHandler = (req: Request, res: Response): void => {
  const projectId = String(req.params.id ?? '');
  const groupId = String(req.params.groupId ?? '');
  console.log('📥 [express-env.probeExpressEnvGroupHandler] Request received', {
    projectId,
    groupId,
  });

  try {
    const data = processProbeExpressEnvGroup(projectId, groupId);
    console.log('📤 [express-env.probeExpressEnvGroupHandler] Sending response', {
      statusCode: 200,
    });
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Probe failed';
    console.error('❌ [express-env.probeExpressEnvGroupHandler] Probe failed', {
      projectId,
      groupId,
      message,
    });
    res.status(500).json({ success: false, error: message });
  }
};
