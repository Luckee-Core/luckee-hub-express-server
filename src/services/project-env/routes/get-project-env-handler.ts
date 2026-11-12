import type { Request, Response } from 'express';

import type { HubProjectRepoRole } from '../../projects/types';
import { processGetProjectEnv } from '../process-get-project-env';

const ROLES: HubProjectRepoRole[] = [
  'web',
  'express',
  'storage',
  'console',
  'dispatcher-web',
  'dispatcher',
  'mobile',
];

/**
 * GET /api/projects/:id/env?role=&repoName=
 */
export const getProjectEnvHandler = async (req: Request, res: Response) => {
  const projectId = String(req.params.id);
  const role = String(req.query.role ?? '') as HubProjectRepoRole;
  const repoName = String(req.query.repoName ?? '');

  console.log('📥 [project-env.getProjectEnvHandler]', { projectId, role, repoName });

  if (!ROLES.includes(role) || !repoName) {
    return res.status(400).json({ success: false, error: 'role and repoName are required' });
  }

  try {
    const data = processGetProjectEnv({ projectId, role, repoName });
    console.log('📤 [project-env.getProjectEnvHandler] ok', { sections: data.sections.length });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('❌ [project-env.getProjectEnvHandler]', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Probe failed',
    });
  }
};
