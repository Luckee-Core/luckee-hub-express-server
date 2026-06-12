import type { IPty } from 'node-pty';

export type TerminalRole = 'express' | 'web';

export type TerminalSessionInfo = {
  sessionId: string;
  studioId: string;
  role: TerminalRole;
  label: string;
};

export type TerminalSessionRecord = TerminalSessionInfo & {
  pty: IPty;
  createdAt: string;
  getReplay: () => string;
};

export type TerminalResizeMessage = {
  type: 'resize';
  cols: number;
  rows: number;
};

export type RunEmbeddedResult = {
  jobId: string;
  sessions: TerminalSessionInfo[];
};
