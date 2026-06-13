export type TerminalRole = 'express' | 'web';

export type TerminalSessionInfo = {
  sessionId: string;
  projectId: string;
  role: TerminalRole;
  label: string;
};

export type TerminalSessionRecord = TerminalSessionInfo & {
  pty: import('node-pty').IPty;
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
