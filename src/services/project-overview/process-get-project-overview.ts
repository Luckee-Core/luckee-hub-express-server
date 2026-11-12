import fs from 'fs';
import path from 'path';

import { getHubRoot } from '../../utils/express-env/resolve-project-for-env';
import type { ProjectOverview } from './types';

const PROJECT_ID = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Read `data/project-overviews/<projectId>.json`. Returns null when no overview has been written.
 */
export const processGetProjectOverview = (projectId: string): ProjectOverview | null => {
  if (!PROJECT_ID.test(projectId)) {
    return null;
  }
  const filePath = path.join(getHubRoot(), 'data', 'project-overviews', `${projectId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as ProjectOverview;
};
