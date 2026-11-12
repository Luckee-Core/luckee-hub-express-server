import { Request, Response } from 'express';

import type { HubProjectRepoRole } from '../../projects/types';
import { processOpenRepoFolder } from '../process-open-repo-folder';

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
 * POST /api/launcher/projects/:id/open-folder — reveal a repo checkout in Finder.
 * Body: { role, repoName }
 */
export const openRepoFolderHandler = (req: Request, res: Response): void => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const role = String(req.body?.role ?? '') as HubProjectRepoRole;
  const repoName = String(req.body?.repoName ?? '');

  console.log('📥 [launcher.openRepoFolderHandler] Request received', { projectId, role, repoName });

  if (!projectId || !ROLES.includes(role) || !repoName) {
    res.status(400).json({ success: false, error: 'Project id, role and repoName are required' });
    return;
  }

  try {
    const result = processOpenRepoFolder(projectId, role, repoName);
    if (!result.ok) {
      console.log('📤 [launcher.openRepoFolderHandler] Sending response', { statusCode: 400 });
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    console.log('✅ [launcher.openRepoFolderHandler] Finder opened', { dir: result.dir });
    res.status(200).json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [launcher.openRepoFolderHandler] Failed to open Finder', { projectId, message });
    res.status(500).json({ success: false, error: message });
  }
};
