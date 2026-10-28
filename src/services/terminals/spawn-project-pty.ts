import * as pty from 'node-pty';

import { ensureSpawnHelperExecutable } from '../../utils/terminals/ensure-spawn-helper';
import { readEnvKey } from '../../utils/supabase-config/upsert-env-keys';
import { buildNvmShellPrefix, shellEscape } from '../../utils/projects/build-nvm-shell-prefix';
import { detectApiRuntime } from '../../utils/projects/detect-api-runtime';
import type { MergedProjectConfig } from '../projects/types';
import { registerSession, removeSession } from './session-registry';
import type { TerminalRole, TerminalSessionInfo, TerminalSessionKind } from './types';

type PtyEnvInput = {
  cwd: string;
  /** Project dev port — hub-express PORT must not leak into child servers. */
  port: number;
};

const buildPtyEnv = (input: PtyEnvInput): Record<string, string> => {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string' && key !== 'PORT' && key !== 'DATABASE_URL') {
      env[key] = value;
    }
  }
  env.PWD = input.cwd;
  env.TERM = env.TERM ?? 'xterm-256color';
  env.PORT = String(input.port);
  return env;
};

const buildNvmPrefix = buildNvmShellPrefix;

const API_HEALTH_READY_PATTERN =
  '"status"[[:space:]]*:[[:space:]]*"ok"|"success"[[:space:]]*:[[:space:]]*true';

/**
 * Build shell command to start the API dev server in a PTY.
 * Node runs npm. Python activates .venv and runs main.py.
 */
const resolveExpressRunPort = (merged: MergedProjectConfig): number => {
  const fromEnv = merged.expressDir ? readEnvKey(merged.expressDir, 'PORT') : null;
  if (fromEnv) {
    const port = Number(fromEnv);
    if (Number.isFinite(port) && port > 0) {
      return port;
    }
  }
  return merged.apiPort;
};

export const buildExpressPtyCommand = (merged: MergedProjectConfig): string => {
  const dir = shellEscape(merged.expressDir ?? '');
  const runPort = resolveExpressRunPort(merged);
  const runtime = detectApiRuntime(merged.expressDir);
  if (runtime === 'python') {
    return (
      `cd '${dir}' && source .venv/bin/activate && export PORT=${runPort} && ` +
      `echo '>>> ${merged.id} Python (:${runPort})' && python main.py`
    );
  }

  const nvm = buildNvmPrefix(merged.nvmSh);
  const webOriginExport =
    merged.webPortStart > 0
      ? `export WEB_APP_ORIGIN='http://127.0.0.1:${merged.webPortStart}' && ` +
        `export WEB_ORIGIN='http://127.0.0.1:${merged.webPortStart}' && `
      : '';
  return (
    `cd '${dir}' && ${nvm} && export PORT=${runPort} && ${webOriginExport}` +
    `echo '>>> ${merged.id} Express (:${runPort})' && npm run dev`
  );
};

/**
 * Build shell command to wait for Express health then start Next.js.
 */
/**
 * Shell that picks the first free TCP port from the catalog webPortStart (or 3000), skipping the API port.
 * Next is then started on that port so a busy slot walks forward through 3100.
 */
const buildNextDevPortWalk = (apiPort: number, webPortStart: number): string => {
  const walkStart = webPortStart > 0 ? webPortStart : 3000;
  const skipApi = apiPort > 0 ? `[ "$port" -ne ${apiPort} ] && ` : '';
  return (
    `unset PORT && port=${walkStart} && ` +
    `while [ "$port" -le 3100 ]; do ` +
    `if ${skipApi}! lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then break; fi; ` +
    `port=$((port + 1)); ` +
    `done && ` +
    `if [ "$port" -gt 3100 ]; then echo '>>> No free Next.js port from ${walkStart} through 3100'; exit 1; fi && `
  );
};

/** Plain `next dev` ignores WEB_DEV_PORT_*; pass --port so hub readiness probes match the listener. */
const buildNextDevRun = (): string => `npm run dev -- --port "$port"`;

/**
 * Pin `dev-with-dynamic-port.mjs` (Next template) to the shell-chosen port.
 * Those scripts ignore `npm run dev -- --port`; they honor WEB_DEV_PORT_* instead.
 */
const buildWebDevPortPin = (): string =>
  `export WEB_DEV_PORT_START="$port" && export WEB_DEV_PORT_END="$port" && `;

const buildExpressApiEnvExports = (apiPort: number): string => {
  if (apiPort <= 0) {
    return '';
  }
  const apiUrl = `http://127.0.0.1:${apiPort}`;
  return (
    `export NEXT_PUBLIC_SERVER_URL='${apiUrl}' && ` +
    `export NEXT_PUBLIC_API_URL='${apiUrl}' && ` +
    `export EXPRESS_API_URL='${apiUrl}' && ` +
    `export NEXT_PUBLIC_EXPRESS_URL='${apiUrl}' && ` +
    `export NEXT_PUBLIC_CMS_URL='${apiUrl}' && ` +
    `export COMMIT_SUMMARIES_EXPRESS_URL='${apiUrl}' && ` +
    `export CODE_CONTROL_API_URL='${apiUrl}' && ` +
    `export NEXT_PUBLIC_CODE_CONTROL_API_URL='${apiUrl}' && ` +
    `export NEXT_PUBLIC_INNERTUBE_EXPRESS_URL='${apiUrl}' && `
  );
};

export const buildWebPtyCommand = (merged: MergedProjectConfig): string => {
  const dir = shellEscape(merged.webDir ?? '');
  const nvm = buildNvmPrefix(merged.nvmSh);
  const healthUrl = `http://127.0.0.1:${merged.apiPort}${merged.healthPath}`;
  const apiEnv = buildExpressApiEnvExports(merged.apiPort);
  const apiLabel = detectApiRuntime(merged.expressDir) === 'python' ? 'Python' : 'Express';
  return (
    `cd '${dir}' && ${nvm} && ${apiEnv}` +
    `echo '>>> ${merged.id} Web — waiting for ${apiLabel}...' && ` +
    `until curl -fsS '${healthUrl}' 2>/dev/null | grep -qE '${API_HEALTH_READY_PATTERN}'; do sleep 2; done && ` +
    `echo '>>> ${apiLabel} ready. Starting Next.js...' && ${buildNextDevPortWalk(merged.apiPort, merged.webPortStart)}` +
    `${buildWebDevPortPin()}` +
    `echo ">>> ${merged.id} Web (Next.js :$port)" && ${buildNextDevRun()}`
  );
};

/**
 * Build shell command for a detected running service (no new server start).
 */
/**
 * Tail local-scheduler worker log file (spawned Express stdout/stderr).
 */
export const buildSchedulerWorkerLogPtyCommand = (logPath: string): string => {
  const escaped = shellEscape(logPath);
  return (
    `echo '>>> Scheduler worker log (tail -F)' && ` +
    `echo '>>> ${escaped}' && ` +
    `touch '${escaped}' && exec tail -n 50 -F '${escaped}'`
  );
};

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
/**
 * Build shell command to start Storage Express (git pull + npm run dev).
 */
export const buildStorageExpressPtyCommand = (
  merged: MergedProjectConfig,
  storagePort: number,
): string => {
  const dir = shellEscape(merged.storageExpressDir ?? '');
  const nvm = buildNvmPrefix(merged.nvmSh);
  return (
    `cd '${dir}' && ${nvm} && export PORT=${storagePort} && ` +
    `echo '>>> ${merged.id} Storage (:${storagePort})' && ` +
    `git pull --ff-only && npm run dev`
  );
};

export const buildWebOnlyPtyCommand = (merged: MergedProjectConfig): string => {
  const dir = shellEscape(merged.webDir ?? '');
  const nvm = buildNvmPrefix(merged.nvmSh);
  const apiEnv = buildExpressApiEnvExports(merged.apiPort);
  return (
    `cd '${dir}' && ${nvm} && ${apiEnv}${buildNextDevPortWalk(merged.apiPort, merged.webPortStart)}` +
    `${buildWebDevPortPin()}` +
    `echo ">>> ${merged.id} Web (Next.js :$port)" && ${buildNextDevRun()}`
  );
};

type SpawnProjectPtyInput = {
  projectId: string;
  role: TerminalRole;
  label: string;
  command: string;
  cwd: string;
  port: number;
  kind?: TerminalSessionKind;
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
    kind: input.kind ?? 'dev',
    port: input.port,
  };

  registerSession(record);

  ptyProcess.onExit(() => {
    removeSession(sessionId);
  });

  return {
    sessionId,
    projectId: input.projectId,
    role: input.role,
    label: input.label,
  };
};
