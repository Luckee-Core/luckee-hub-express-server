# 008 — Local launcher service

## Status

Accepted

## Context

`luckee-hub-express-server` spawns embedded dev-server terminals and opens Cursor/Chrome for hooked-up projects. It is a **local-only** tool, not a cloud API.

## Decision

### Security

- Server binds **`127.0.0.1` only** in development.
- Launcher endpoints spawn local processes (`node-pty`, `open`) — never expose this server to LAN without auth.

### No database v1 (catalog only)

- Project catalog: `data/projects.registry.json`
- Machine paths: `hub.local.json` → `projects`
- Job state: `/tmp/luckee-hub/jobs/{jobId}.json`

Local Postgres setup for individual projects is handled by the **local-database** service (ADR 011).

### Services

| Service | Path | Role |
|---------|------|------|
| projects | `src/services/projects/` | `GET /api/projects` — merge registry + local + probes |
| local-database | `src/services/local-database/` | `GET/POST /api/projects/:id/local-database` |
| launcher | `src/services/launcher/` | `POST /api/launcher/projects/:id/*`; `GET` job status |
| terminals | `src/services/terminals/` | Embedded PTYs, WebSocket stream, sync |

### macOS helpers

- `src/utils/launcher/` — open Chrome, open Cursor workspace, resolve web URL

### Handler pattern carve-out

Hub-express has **no managed Supabase/Anthropic client**. ADR 002 step 1 (get managed client + null check) is **N/A** for hub handlers. Validate request params, then delegate to `processX()` inside try/catch.
