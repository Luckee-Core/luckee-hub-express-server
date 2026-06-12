import fs from 'fs';
import path from 'path';

import type { StudioRegistryEntry } from '../../services/studios/types';

/**
 * Load committed studio catalog from data/studios.registry.json.
 */
export const readRegistry = (hubRoot: string): StudioRegistryEntry[] => {
  const filePath = path.join(hubRoot, 'data', 'studios.registry.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as StudioRegistryEntry[];
};
