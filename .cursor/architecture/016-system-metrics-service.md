# 016 — System metrics service

## Status

Accepted

## Context

The Luckee hub projects list runs many local dev servers. Developers need at-a-glance **CPU/GPU** load and **top CPU processes** on the Mac hosting hub-express, without opening Activity Monitor.

## Decision

### Endpoint

- `GET /api/system-metrics` — returns `{ success: true, data: SystemMetricsSnapshot }`
- Mounted on hub-express at `127.0.0.1` (same security model as [008](./008-local-launcher-service.md))

### Platform

- **Apple Silicon only** (`darwin` + `arm64`)
- Uses [`apple-silicon-metrics`](https://www.npmjs.com/package/apple-silicon-metrics) `sampleOnce({ intervalMs: 800 })` for CPU/GPU ratios
- Unsupported hosts → **400** with a clear error message

### Top processes

- `ps -Ao pid,comm,%cpu -r -c` via `execFile` (no shell)
- Up to 3 processes; empty array if `ps` fails (snapshot still returns CPU/GPU)

### Layout

```text
src/services/system-metrics/   # router, handler, processSampleSystemMetrics, types
src/utils/system-metrics/      # assert platform, ps reader, sample mapper
```

### Response shape

`cpu.usagePercent`, `gpu.usagePercent`, `topProcesses[]`, `sampledAt`, optional `chipName`.

## Security

Local-only API; no auth. Do not expose hub-express to LAN without additional controls.

## Risks

`apple-silicon-metrics` relies on undocumented macOS interfaces; OS upgrades may require dependency updates.
