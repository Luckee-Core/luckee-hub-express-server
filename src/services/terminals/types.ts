export type TerminalRole = 'express' | 'web' | 'storage-express' | 'scheduler-worker';

export type TerminalSessionKind = 'dev' | 'status';

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
  /** Timestamped PTY output; use instead of `pty.onData` so live and replayed lines match. */
  onOutput: (listener: (data: string) => void) => { dispose: () => void };
  kind: TerminalSessionKind;
  port: number;
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
