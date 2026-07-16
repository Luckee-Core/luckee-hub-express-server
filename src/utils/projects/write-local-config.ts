import fs from 'fs';
import path from 'path';

import type { HubLocalConfig } from '../../services/projects/types';

/**
 * Atomically write machine-specific hub.local.json.
 */
export const writeLocalConfig = (hubRoot: string, config: HubLocalConfig): void => {
  const filePath = path.join(hubRoot, 'hub.local.json');
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(config, null, 2)}\n`);
  fs.renameSync(tempPath, filePath);
};
