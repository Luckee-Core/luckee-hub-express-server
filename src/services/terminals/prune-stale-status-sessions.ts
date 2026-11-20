import type { MergedProjectConfig } from '../projects/types';
import { isNextDevServerOnPort } from '../../utils/projects/port-probes';
import { isApiRunning } from '../../utils/projects/wait-for-project-ready';
import { killSession, listSessionRecords } from './session-registry';

/**
 * Kill status-only PTYs whose ports are not this project's process.
 */
export const pruneStaleStatusSessions = (merged: MergedProjectConfig): void => {
  for (const record of listSessionRecords()) {
    if (record.projectId !== merged.id || record.kind !== 'status') {
      continue;
    }

    if (record.role === 'scheduler-worker') {
      continue;
    }

    const owned =
      record.role === 'express'
        ? !!(merged.expressDir && isApiRunning(record.port, merged.expressDir))
        : !!(merged.webDir && isNextDevServerOnPort(record.port, merged.webDir));

    if (!owned) {
      killSession(record.sessionId);
    }
  }
};

