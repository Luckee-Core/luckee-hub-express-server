import { upsertEnvKeys } from '../../utils/supabase-config/upsert-env-keys';
import { resolveProjectContext, getHubRoot } from '../../utils/express-env/resolve-project-for-env';
import { processGetDataPlane } from './process-get-data-plane';
import type { DataPlaneSetResult } from './types';

/**
 * Write data-plane mode key on the API express `.env`.
 */
export const processSetDataPlane = (
  projectId: string,
  optionId: string,
): DataPlaneSetResult => {
  const before = processGetDataPlane(projectId);
  const ctx = resolveProjectContext(projectId, getHubRoot());
  if (!ctx?.entry.dataPlane) {
    return { success: false, message: 'No data plane configured', probe: before };
  }

  const expressDir = ctx.merged?.expressDir;
  if (!expressDir) {
    return { success: false, message: 'Express repo not cloned', probe: before };
  }

  const option = ctx.entry.dataPlane.options.find((o) => o.id === optionId);
  if (!option) {
    return { success: false, message: 'Invalid data plane option', probe: before };
  }

  upsertEnvKeys(expressDir, { [ctx.entry.dataPlane.modeKey]: option.value });
  const probe = processGetDataPlane(projectId);
  return { success: true, message: `Data plane set to ${option.label}`, probe };
};
