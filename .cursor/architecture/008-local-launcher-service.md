# 008 — Local launcher service

## Status

Accepted

## Context

`luckee-hub-express-server` spawns embedded dev-server terminals and opens Cursor/Chrome for hooked-up studios. It is a **local-only** tool, not a cloud API.

## Decision

### Security

- Server binds **`127.0.0.1` only** in development.
- Launcher endpoints spawn local processes (`node-pty`, `open`) — never expose this server to LAN without auth.

### No database v1

- Studio catalog: `data/studios.registry.json`
- Machine paths: `hub.local.json` (gitignored)
- Job state: `/tmp/luckee-hub/jobs/{jobId}.json`

### Services

| Service | Path | Role |
|---------|------|------|
| studios | `src/services/studios/` | `GET /api/studios` — merge registry + local + probes |
| launcher | `src/services/launcher/` | `POST` run / open-cursor / open-chrome; `GET` job status |
| terminals | `src/services/terminals/` | Embedded PTYs, WebSocket stream, sync |

### macOS helpers

- `src/utils/launcher/` — open Chrome, open Cursor workspace, resolve web URL
