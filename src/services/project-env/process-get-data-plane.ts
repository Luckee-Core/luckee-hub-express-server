import { readEnvKey } from '../../utils/supabase-config/upsert-env-keys';
import { resolveProjectContext, getHubRoot } from '../../utils/express-env/resolve-project-for-env';
import type { DataPlaneProbe } from './types';

/**
 * Read current data-plane mode from the API express `.env`.
 */
export const processGetDataPlane = (projectId: string): DataPlaneProbe => {
  const ctx = resolveProjectContext(projectId, getHubRoot());
  if (!ctx?.entry.dataPlane) {
    return { supported: false, message: 'No data plane configured for this project' };
  }

  const expressDir = ctx.merged?.expressDir;
  if (!expressDir) {
    return {
      supported: true,
      modeKey: ctx.entry.dataPlane.modeKey,
      value: null,
      activeOptionId: null,
      message: 'Express repo not cloned',
    };
  }

  const { dataPlane } = ctx.entry;
  const value = readEnvKey(expressDir, dataPlane.modeKey);
  const normalized = value?.toLowerCase() ?? null;
  const activeOption =
    dataPlane.options.find((o) => o.value.toLowerCase() === normalized) ?? null;

  return {
    supported: true,
    modeKey: dataPlane.modeKey,
    value,
    activeOptionId: activeOption?.id ?? null,
  };
};
