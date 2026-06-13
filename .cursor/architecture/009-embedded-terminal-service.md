# 009 — Embedded terminal service

## Status

Accepted

## Context

Luckee Hub Run spawns interactive dev-server terminals inside the hub UI (right-side terminal dock), not macOS Terminal.app windows.

## Decision

### Stack

- **`node-pty`** — spawn `zsh` with `npm run dev` per studio process
- **`ws`** — WebSocket on the same `http.Server` as Express (`127.0.0.1` only)
- **In-memory session registry** — `Map<sessionId, { pty, studioId, role }>`; sessions die on hub-express restart

### Service layout

`src/services/terminals/` — list/kill HTTP routes + WebSocket attach at `/api/terminals/ws/:sessionId`

### Run flow

All **Run** jobs use embedded PTYs via `process-run-embedded.ts` (invoked from `src/services/launcher/process-run-studio.ts`).

### WebSocket protocol (v1)

- Server → client: raw PTY stdout (text frames)
- Client → server: stdin text; JSON `{ "type": "resize", "cols", "rows" }`

### Security

- Bind `127.0.0.1` only (ADR 008)
- WebSocket connects only for known `sessionId` in registry
- No cloud deploy without auth
