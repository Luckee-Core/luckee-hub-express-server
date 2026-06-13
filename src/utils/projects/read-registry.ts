import fs from 'fs';
import path from 'path';

import type { ProjectRegistryEntry } from '../../services/projects/types';

/**
 * Load committed project catalog from data/projects.registry.json.
 */
export const readRegistry = (hubRoot: string): ProjectRegistryEntry[] => {
  const filePath = path.join(hubRoot, 'data', 'projects.registry.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as ProjectRegistryEntry[];
};
