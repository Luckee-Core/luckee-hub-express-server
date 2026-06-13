import fs from 'fs';
import path from 'path';

import type { HubLocalConfig } from '../../services/projects/types';

/**
 * Load machine-specific hub.local.json (returns empty object if missing).
 */
export const readLocalConfig = (hubRoot: string): HubLocalConfig => {
  const filePath = path.join(hubRoot, 'hub.local.json');
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as HubLocalConfig;
};
