import { Request, Response } from 'express';

import { readRegistry } from '../../../utils/projects';
import { getHubRoot } from '../../../utils/projects/get-hub-root';
import { validateLaunchPath } from '../../../utils/launcher';
import { renderLaunchErrorHtml, renderLaunchPageHtml } from '../render-launch-page-html';

/**
 * GET /launch/:projectId?path=/… — HTML page that opens the project at `path` (ADR 035).
 */
export const getLaunchPageHandler = (req: Request, res: Response): void => {
  const projectId = Array.isArray(req.params.projectId)
    ? req.params.projectId[0]
    : req.params.projectId;
  const rawPath = Array.isArray(req.query.path) ? req.query.path[0] : req.query.path;
  const path = rawPath === undefined ? '/' : rawPath;

  console.log('📥 [launchPage.getLaunchPageHandler] Request received', { projectId, path });

  const entry = readRegistry(getHubRoot()).find((project) => project.id === projectId);
  if (!entry) {
    console.log('📤 [launchPage.getLaunchPageHandler] Sending response', { statusCode: 404 });
    res.status(404).type('html').send(renderLaunchErrorHtml(`Unknown Luckee Hub project "${projectId ?? ''}".`));
    return;
  }

  const pathError = validateLaunchPath(path);
  if (pathError) {
    console.log('📤 [launchPage.getLaunchPageHandler] Sending response', {
      statusCode: 400,
      pathError,
    });
    res.status(400).type('html').send(renderLaunchErrorHtml(pathError));
    return;
  }

  console.log('📤 [launchPage.getLaunchPageHandler] Sending response', { statusCode: 200 });
  res
    .status(200)
    .type('html')
    .set('Cache-Control', 'no-store')
    .send(renderLaunchPageHtml({ projectId: entry.id, projectName: entry.name, path: path as string }));
};
