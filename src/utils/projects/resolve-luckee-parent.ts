import type { HubLocalConfig } from '../../services/projects/types';

/**
 * Resolve the parent directory for the required `luckee/` folder.
 */
export const resolveLuckeeParent = (localConfig: HubLocalConfig): string | undefined =>
  localConfig.luckeeParent ?? localConfig.workspaceParent;
