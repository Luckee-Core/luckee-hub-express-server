import { processRunEmbedded } from '../terminals/process-run-embedded';
import type { TerminalSessionInfo } from '../terminals/types';

export type RunStudioResult = {
  jobId: string;
  sessions?: TerminalSessionInfo[];
};

/**
 * Start studio dev servers via embedded hub terminals.
 */
export const processRunStudio = (studioId: string): RunStudioResult | null =>
  processRunEmbedded(studioId);
