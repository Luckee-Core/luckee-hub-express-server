import type { Request, Response } from 'express';

import { processSaveExpressEnvGroup } from '../process-save-express-env-group';

/**
 * POST /api/projects/:id/express-env/:groupId — upsert group keys into express .env.
 */
export const saveExpressEnvGroupHandler = (req: Request, res: Response): void => {
  const projectId = String(req.params.id ?? '');
  const groupId = String(req.params.groupId ?? '');
  console.log('📥 [express-env.saveExpressEnvGroupHandler] Request received', {
    projectId,
    groupId,
  });

  try {
    const body = req.body;
    const values: Record<string, string> =
      body && typeof body === 'object' && !Array.isArray(body)
        ? Object.fromEntries(
            Object.entries(body as Record<string, unknown>).map(([key, value]) => [
              key,
              String(value ?? ''),
            ]),
          )
        : {};

    const result = processSaveExpressEnvGroup(projectId, groupId, values);
    if ('error' in result) {
      console.log('📤 [express-env.saveExpressEnvGroupHandler] Sending response', {
        statusCode: result.status,
      });
      res.status(result.status).json({ success: false, error: result.error });
      return;
    }

    console.log('✅ [express-env.saveExpressEnvGroupHandler] Config saved', {
      projectId,
      groupId,
    });
    console.log('📤 [express-env.saveExpressEnvGroupHandler] Sending response', {
      statusCode: 200,
    });
    res.status(200).json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Save failed';
    console.error('❌ [express-env.saveExpressEnvGroupHandler] Save failed', {
      projectId,
      groupId,
      message,
    });
    res.status(500).json({ success: false, error: message });
  }
};
