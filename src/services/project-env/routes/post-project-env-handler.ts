import type { Request, Response } from 'express';

import type { HubProjectRepoRole } from '../../projects/types';
import { processSaveProjectEnv } from '../process-save-project-env';

/**
 * POST /api/projects/:id/env — upsert keys for one repo.
 */
export const postProjectEnvHandler = async (req: Request, res: Response) => {
  const projectId = String(req.params.id);
  const { role, repoName, values } = req.body as {
    role?: HubProjectRepoRole;
    repoName?: string;
    values?: Record<string, string>;
  };

  console.log('📥 [project-env.postProjectEnvHandler]', { projectId, role, repoName });

  if (!role || !repoName || !values || typeof values !== 'object') {
    return res.status(400).json({ success: false, error: 'role, repoName, and values are required' });
  }

  try {
    const result = processSaveProjectEnv({ projectId, role, repoName, values });
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.message, data: result.probe });
    }
    console.log('✅ [project-env.postProjectEnvHandler] saved');
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [project-env.postProjectEnvHandler]', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Save failed',
    });
  }
};
