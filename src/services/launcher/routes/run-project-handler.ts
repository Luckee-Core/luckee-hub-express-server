import { Request, Response } from 'express';

import { processRunProject } from '../process-run-project';
import {
  parseRunTargetsFromBody,
  resolveRunTargets,
} from '../run-project-targets';
import { readRegistry } from '../../../utils/projects';
import { getHubRoot } from '../../../utils/projects/get-hub-root';

/**
 * POST /api/launcher/projects/:id/run — spawn project dev servers.
 */
export const runProjectHandler = (req: Request, res: Response): void => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!projectId) {
    res.status(400).json({ success: false, error: 'Project id required' });
    return;
  }

  const parsedTargets = parseRunTargetsFromBody(req.body);
  if (parsedTargets && 'error' in parsedTargets) {
    res.status(400).json({ success: false, error: parsedTargets.error });
    return;
  }

  const hubRoot = getHubRoot();
  const entry = readRegistry(hubRoot).find((project) => project.id === projectId);
  if (!entry) {
    res.status(400).json({ success: false, error: 'Project not found' });
    return;
  }

  const resolvedTargets = resolveRunTargets(entry, parsedTargets);
  if ('error' in resolvedTargets) {
    res.status(400).json({ success: false, error: resolvedTargets.error });
    return;
  }

  console.log('📥 [launcher.runProjectHandler] Request received', {
    projectId,
    targets: resolvedTargets,
  });
  try {
    const result = processRunProject(projectId, resolvedTargets);
    if (!result) {
      console.log('📤 [launcher.runProjectHandler] Sending response', { statusCode: 400 });
      res.status(400).json({ success: false, error: 'Project not configured' });
      return;
    }

    console.log('✅ [launcher.runProjectHandler] Run started', { projectId, jobId: result.jobId });
    console.log('📤 [launcher.runProjectHandler] Sending response', { statusCode: 200 });
    res.status(200).json({
      success: true,
      data: {
        jobId: result.jobId,
        sessions: result.sessions ?? [],
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [launcher.runProjectHandler] Failed to run project', { projectId, message });
    res.status(500).json({ success: false, error: message });
  }
};
