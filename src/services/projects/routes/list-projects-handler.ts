import type { Request, Response } from 'express';

import { processListProjects } from '../process-list-projects';

/**
 * GET /api/projects — list catalog with hook status.
 */
export const listProjectsHandler = async (req: Request, res: Response) => {
  const liveProbe = req.query.live === '1' || req.query.live === 'true';
  console.log('📥 [projects.listProjectsHandler] Request received', { liveProbe });
  try {
    const projects = processListProjects({ liveProbe });
    console.log('✅ [projects.listProjectsHandler] Projects listed', { count: projects.length });
    console.log('📤 [projects.listProjectsHandler] Sending response', { statusCode: 200 });
    res.status(200).json({ success: true, data: projects });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list projects';
    console.error('❌ [projects.listProjectsHandler] Failed to list projects', { message });
    res.status(500).json({ success: false, error: message });
  }
};
