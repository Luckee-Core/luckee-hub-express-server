# 008 — Local launcher service

## Status

Accepted

## Context

`luckee-hub-express-server` spawns macOS Terminal windows and opens Cursor/Chrome for hooked-up studios. It is a **local-only** tool, not a cloud API.

## Decision

### Security

- Server binds **`127.0.0.1` only** in development.
- Launcher endpoints spawn `zsh` under `launcher/` — never expose this server to LAN without auth.

### No database v1

- Studio catalog: `data/studios.registry.json`
- Machine paths: `hub.local.json` (gitignored)
- Job state: `/tmp/luckee-hub/jobs/{jobId}.json`

### Services

| Service | Path | Role |
|---------|------|------|
| studios | `src/services/studios/` | `GET /api/studios` — merge registry + local + probes |
| launcher | `src/services/launcher/` | `POST` run / open-cursor / open-chrome; `GET` job status |

### Shell

- Zsh modules in `launcher/` at repo root
- `run-studio.sh` reads studio config from **environment variables** set by Express before spawn
