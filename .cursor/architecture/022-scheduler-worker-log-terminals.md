# 022 — Scheduler worker log terminals

## Status

Accepted

## Context

Local Scheduler spawns worker Express apps as detached shells with stdout/stderr appended to `$SCHEDULER_WORKERS_DIR/{workerProjectId}.log`. The Hub **local-scheduler** Express terminal only shows scheduler process logs, so operators see a long silent wait during health checks.

Local Scheduler exposes `GET /api/workers` with spawn `phase` and `logPath`.

## Decision

1. On `POST /api/terminals/sync`, after orphan status tabs, hub-express calls `http://127.0.0.1:{local-scheduler-apiPort}/api/workers` (loopback only).
2. For each worker with `phase === starting`, or `phase === failed` with `updatedAt` within the last five minutes, spawn a PTY on the **worker hub project** (e.g. `my-gmail-manager`), not on `local-scheduler`.
3. Terminal role: `scheduler-worker`. Command: `tail -n 50 -F` on `logPath` via `buildSchedulerWorkerLogPtyCommand`.
4. Skip when the user suppressed the role or a `scheduler-worker` tab already exists for that project.
5. Prune stale **status** sessions must not kill `scheduler-worker` tabs.

## Security

- Scheduler and worker URLs are loopback only.
- No worker secrets in hub config; log paths come from scheduler API.

## Related

- Local Scheduler ADR 009 — workers service and manifest files
- [009 – Embedded terminal service](./009-embedded-terminal-service.md)
