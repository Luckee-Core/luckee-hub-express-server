import type { MergedProjectConfig } from '../projects/types';
import { isNextDevServerOnPort } from '../../utils/projects/port-probes';
import { isExpressHealthy } from '../../utils/projects/wait-for-project-ready';
import { killSession, listSessionRecords } from './session-registry';

/**
 * Kill status-only PTYs whose ports are not this project's process.
 */
export const pruneStaleStatusSessions = (merged: MergedProjectConfig): void => {
  for (const record of listSessionRecords()) {
    if (record.projectId !== merged.id || record.kind !== 'status') {
      continue;
    }

    const owned =
      record.role === 'express'
        ? !!(merged.expressDir && isExpressHealthy(record.port, merged.healthPath, merged.expressDir))
        : !!(merged.webDir && isNextDevServerOnPort(record.port, merged.webDir));

    if (!owned) {
      killSession(record.sessionId);
    }
  }
};

