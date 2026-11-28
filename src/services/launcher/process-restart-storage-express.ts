import { processCloseStorageExpress } from './process-close-storage-express';
import {
  processRunStorageExpress,
  type RunStorageExpressResult,
} from './process-run-storage-express';

export type RestartStorageExpressResult = RunStorageExpressResult & {
  wasRunning: boolean;
};

/**
 * Stop Storage Express (hub terminal and any listener on its port) and start it again.
 * When it was not running this is the same as Start.
 */
export const processRestartStorageExpress = (
  projectId: string,
): RestartStorageExpressResult | { error: string; status: 400 | 500 } => {
  console.log('🚀 [launcher.processRestartStorageExpress] Restarting storage', { projectId });

  const closeResult = processCloseStorageExpress(projectId);
  const wasRunning = !('error' in closeResult);
  if ('error' in closeResult && closeResult.error === 'Project has no Storage Express repo') {
    return closeResult;
  }

  const runResult = processRunStorageExpress(projectId);
  if ('error' in runResult) {
    return runResult;
  }

  console.log('✅ [launcher.processRestartStorageExpress] Complete', { projectId, wasRunning });
  return { ...runResult, wasRunning };
};
