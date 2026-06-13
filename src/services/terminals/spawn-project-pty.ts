import * as pty from 'node-pty';

import { ensureSpawnHelperExecutable } from '../../utils/terminals/ensure-spawn-helper';
import type { MergedProjectConfig } from '../projects/types';
import { registerSession } from './session-registry';
import type { TerminalRole, TerminalSessionInfo } from './types';

type PtyEnvInput = {
  cwd: string;
  /** Project dev port — hub-express PORT must not leak into child servers. */
  port: number;
};

const buildPtyEnv = (input: PtyEnvInput): Record<string, string> => {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string' && key !== 'PORT') {
      env[key] = value;
    }
  }
  env.PWD = input.cwd;
  env.TERM = env.TERM ?? 'xterm-256color';
  env.PORT = String(input.port);
  return env;
};

const shellEscape = (value: string): string => value.replace(/'/g, "'\\''");

const buildNvmPrefix = (nvmSh: string): string =>
  `export NVM_DIR="$HOME/.nvm" && [ -s '${shellEscape(nvmSh)}' ] && . '${shellEscape(nvmSh)}'`;

/**
 * Build shell command to start Express dev server in a PTY.
 */
export const buildExpressPtyCommand = (merged: MergedProjectConfig): string => {
  const dir = shellEscape(merged.expressDir ?? '');
  const nvm = buildNvmPrefix(merged.nvmSh);
  return (
    `cd '${dir}' && ${nvm} && export PORT=${merged.apiPort} && ` +
    `echo '>>> ${merged.id} Express (:${merged.apiPort})' && npm run dev`
  );
};

/**
 * Build shell command to wait for Express health then start Next.js.
 */
export const buildWebPtyCommand = (merged: MergedProjectConfig): string => {
  const dir = shellEscape(merged.webDir ?? '');
  const nvm = buildNvmPrefix(merged.nvmSh);
  const healthUrl = `http://127.0.0.1:${merged.apiPort}${merged.healthPath}`;
  return (
    `cd '${dir}' && ${nvm} && echo '>>> ${merged.id} Web — waiting for Express...' && ` +
    `until curl -fsS '${healthUrl}' 2>/dev/null | grep -qE '"status"[[:space:]]*:[[:space:]]*"ok"'; do sleep 2; done && ` +
    `echo '>>> Express ready. Starting Next.js...' && npm run dev`
  );
};

/**
 * Build shell command for a detected running service (no new server start).
 */
export const buildRunningStatusPtyCommand = (
  label: string,
  port: number,
  orphan = false,
): string => {
  if (orphan) {
    return (
      `echo '>>> ${label} — detected on :${port}' && ` +
      `echo 'Started outside this hub session (or hub-express restarted). Live logs are not available.' && ` +
      `echo 'Press Run again to attach fresh terminals, or close this tab.' && ` +
      `exec tail -f /dev/null`
    );
  }
  return (
    `echo '>>> ${label} — already running on :${port}' && ` +
    `echo 'Refreshing the browser reconnects; history is replayed from the hub buffer.' && ` +
    `exec tail -f /dev/null`
  );
};

/**
 * Build shell command to start Next.js only (Express already healthy).
 */
export const buildWebOnlyPtyCommand = (merged: MergedProjectConfig, webPort: number): string => {
  const dir = shellEscape(merged.webDir ?? '');
  const nvm = buildNvmPrefix(merged.nvmSh);
  return (
    `cd '${dir}' && ${nvm} && export PORT=${webPort} && ` +
    `echo '>>> ${merged.id} Web (Next.js :${webPort})' && npm run dev`
  );
};

type SpawnProjectPtyInput = {
  projectId: string;
  role: TerminalRole;
  label: string;
  command: string;
  cwd: string;
  port: number;
};

/**
 * Spawn an interactive PTY and register it in the session registry.
 */
export const spawnProjectPty = (input: SpawnProjectPtyInput): TerminalSessionInfo => {
  ensureSpawnHelperExecutable();

  const sessionId = `${input.projectId}-${input.role}-${Date.now()}`;
  let ptyProcess: pty.IPty;
  try {
    ptyProcess = pty.spawn('/bin/zsh', ['-lc', input.command], {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: input.cwd,
      env: buildPtyEnv({ cwd: input.cwd, port: input.port }),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'PTY spawn failed';
    throw new Error(
      `${message} (try: chmod +x node_modules/node-pty/prebuilds/${process.platform}-${process.arch}/spawn-helper)`,
    );
  }

  const outputChunks: string[] = [];
  let outputLen = 0;
  const maxOutput = 512_000;

  ptyProcess.onData((data: string) => {
    outputChunks.push(data);
    outputLen += data.length;
    while (outputLen > maxOutput && outputChunks.length > 0) {
      const dropped = outputChunks.shift();
      if (dropped) {
        outputLen -= dropped.length;
      }
    }
  });

  const record = {
    sessionId,
    projectId: input.projectId,
    role: input.role,
    label: input.label,
    pty: ptyProcess,
    createdAt: new Date().toISOString(),
    getReplay: (): string => outputChunks.join(''),
  };

  registerSession(record);

  return {
    sessionId,
    projectId: input.projectId,
    role: input.role,
    label: input.label,
  };
};
