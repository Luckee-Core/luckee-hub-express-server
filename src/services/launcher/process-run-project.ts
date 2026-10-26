import type { ProjectRunTarget } from './run-project-targets';
import { processRunEmbedded } from '../terminals/process-run-embedded';
import type { TerminalSessionInfo } from '../terminals/types';

export type RunProjectResult = {
  jobId: string;
  sessions?: TerminalSessionInfo[];
};

/**
 * Start project dev servers via embedded hub terminals.
 */
export const processRunProject = (
  projectId: string,
  targets?: ProjectRunTarget[],
): RunProjectResult | null => processRunEmbedded(projectId, { targets });
