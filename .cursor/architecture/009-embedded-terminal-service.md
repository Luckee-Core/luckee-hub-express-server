# 009 — Embedded terminal service

## Status

Accepted

## Context

Luckee Hub Run spawns interactive dev-server terminals inside the hub UI (bottom terminal dock), not macOS Terminal.app windows.

## Decision

### Stack

- **`node-pty`** — spawn `zsh` with `npm run dev` per project process
- **`ws`** — WebSocket on the same `http.Server` as Express (`127.0.0.1` only)
- **In-memory session registry** — `Map<sessionId, { pty, projectId, role }>`; sessions die on hub-express restart

### Service layout

`src/services/terminals/` — list/kill HTTP routes + WebSocket attach at `/api/terminals/ws/:sessionId`

### Port ownership

A listener on a catalog port is **not** enough to attach a status tab or treat the API/web as already running. Hub checks `lsof` cwd against the project's `expressDir` / `webDir`. Another Express template on `:3022` (for example) must not open a Local Scheduler tab.

Status PTYs (`kind: 'status'`) are pruned on `/api/terminals/sync` when the port is no longer owned by that project.

Closing a tab (or Close project) suppresses that role until the next Run. Sync and job polling must not reopen a session the user just killed. Job polls only return sessions that are still in the registry.

When a PTY exits, `removeSession` drops the registry entry and does **not** suppress the role. The next sync omits that id. User-closed tabs still use `killSession(id, true)`.

### Web port walk

Run starts Next.js on the first free port from the project **catalog `webPortStart`** (fallback **3000** when unset), skipping the API port. The API stays on its catalog port when that port is free or already belongs to the project. If the catalog port is taken by another process, the API uses the next free port and the project list shows that live port.

Web PTYs export `WEB_DEV_PORT_START` / `WEB_DEV_PORT_END` to that same shell-chosen port before `npm run dev`, and invoke `npm run dev -- --port "$port"` so plain `next dev` apps bind where the hub probes. Template repos that use `scripts/dev-with-dynamic-port.mjs` ignore `--port` CLI args; they still honor `WEB_DEV_PORT_*`. Without a matching port, Next can bind where another app listens (e.g. Luckee Hub on `:3000`) and the run job hangs on “Waiting for Next.js…”.

List live probes share one API lookup for `hookStatus` and `apiPort`: preferred port from `/tmp/luckee-hub/{id}-ports.json`, then the registry port if different. Two health checks at most — not a 10-port scan.

### Run flow

All **Run** jobs use embedded PTYs via `process-run-embedded.ts` (invoked from `src/services/launcher/process-run-studio.ts`).

### WebSocket protocol (v1)

- Server → client: raw PTY stdout (text frames)
- Client → server: stdin text; JSON `{ "type": "resize", "cols", "rows" }`

### Security

- Bind `127.0.0.1` only (ADR 008)
- WebSocket connects only for known `sessionId` in registry
- No cloud deploy without auth
