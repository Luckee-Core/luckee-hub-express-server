import { processRunEmbedded } from '../terminals/process-run-embedded';
import type { TerminalSessionInfo } from '../terminals/types';

export type RunProjectResult = {
  jobId: string;
  sessions?: TerminalSessionInfo[];
};

/**
 * Start project dev servers via embedded hub terminals.
 */
export const processRunProject = (projectId: string): RunProjectResult | null =>
  processRunEmbedded(projectId);
