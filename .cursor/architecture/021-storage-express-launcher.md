# 021 — Storage Express launcher

## Status

Accepted

## Context

Hub-express must support a third repo type for Gmail Manager storage API, local Postgres targeting storage `.env`, and dedicated launcher routes that do not hook into list Run.

## Decision

### Types

- `ProjectRegistryRepoType` includes `storage-express`.
- `ProjectLocalEntry.storageExpressDir` and clone path `{luckeeParent}/luckee/{projectId}/{repoName}`.
- `LocalDatabaseConfig.envRepo?: 'express' | 'storage-express'`; `resolveDatabaseRepoDir()` picks migrations + `DATABASE_URL` target.

### Launcher routes

- `POST /api/launcher/projects/:id/run-storage-express`
- `POST /api/launcher/projects/:id/close-storage-express`

Handlers delegate to `processRunStorageExpress` / `processCloseStorageExpress`. PTY command: `buildStorageExpressPtyCommand`.

### Session registry

- `suppressProjectRoles` includes `storage-express`.
- `clearSuppressedRoles` (list Run) clears express + web only.
- `clearSuppressedStorageExpressRole` for storage Start.

### List projects

When `liveProbe`, set `storageRunning` via health check on storage port/path. Expose `storageExpressSupported` and `storagePort` on `HubProject`.

`probeProjectStatus` still reports storage path/deps in `hookChecks`, but **does not** set `missing` / `cloned` when only storage is absent — list **Run** requires dispatcher + web only (storage runs on another Mac via detail **Start storage**).

### Express env

`ExpressEnvGroupId` includes `storage`. Probe requires `STORAGE_MODE`, `STORAGE_EXPRESS_URL`, and `STORAGE_EXPRESS_SECRET`.

## Related

- [011 – Local database service](./011-local-database-service.md)
- [009 – Embedded terminal service](./009-embedded-terminal-service.md)
- [014 – Express env groups](./014-express-env-groups.md)
