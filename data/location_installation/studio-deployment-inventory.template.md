# Studio deployment inventory (Phase 0)

Copy this file to `studio-deployment-inventory.md` (gitignored locally) and fill in before Phase 1 bring-up. Do not commit secrets.

**Last updated:** ___________

## Machines

| Role | Hostname | macOS | Static LAN IP | Notes |
|------|----------|-------|---------------|-------|
| Storage studio (device 3) | | | | Postgres + Storage Express + Phase 1 cron |
| API / dispatcher (device 2) | | | | Always-on Express (Phase 2+) |
| Apps (device 1) | | | | Gmail web browser |
| Future dedicated cron (Phase 3) | | | | |

## Git checkout paths (must match `hub.local.json`)

| Project | `expressDir` / `storageExpressDir` / `webDir` |
|---------|---------------------------------------------|
| `luckee-hub-express-server` | |
| `my-gmail-manager` express | |
| `my-gmail-manager` storage-express | |
| `my-gmail-manager` web | |
| `local-scheduler` express | |
| `local-scheduler` web (optional) | |

**Duplicate clone risk:** Hub Setup defaults to `{luckeeParent}/luckee/{projectId}/…`. If you develop elsewhere, list overrides here.

## Processes today (before Phase 1)

| Process | Machine | How started | Port |
|---------|---------|-------------|------|
| Postgres 16 | | brew services | 5432 |
| Storage Express | | hub Storage / manual | 3010 |
| Gmail dispatcher Express | | hub Run / manual | 3052 |
| Local scheduler Express | | none / launchd / hub Run | |
| Gmail web | | hub Run | 3053 |

## Port map (listening services)

| Port | Service | Machine |
|------|---------|---------|
| 3001 | Hub Express | |
| 3010 | Storage Express | |
| 3022 | Local scheduler API (hub default) | |
| 3023 | Local scheduler web (optional) | |
| 3052 | Gmail dispatcher | |
| 3053 | Gmail web | |

## Databases on studio Postgres

| Database | Project | Migrated |
|----------|---------|----------|
| `gmail_manager` | my-gmail-manager (storage) | yes / no |
| `local_scheduler` | local-scheduler | yes / no |

## Secrets inventory (names only — values in `.env`)

| Secret | Files that must match |
|--------|------------------------|
| `STORAGE_DISPATCHER_SECRET` / `STORAGE_EXPRESS_SECRET` | storage + dispatcher |
| `TOKEN_ENCRYPTION_KEY` | storage + dispatcher |
| `GMAIL_MANAGER_CRON_SECRET` | scheduler + dispatcher |
| `GMAIL_MANAGER_API_KEY` | dispatcher + web (if used) |

## OAuth / web origins

| App | `WEB_APP_ORIGIN` / redirect URI host |
|-----|--------------------------------------|
| Gmail Manager | |

## Phase target

- [ ] Phase 1 — cron on studio, storage on studio, spawn dispatcher per job
- [ ] Phase 2 — stable API on device 2
- [ ] Phase 3 — dedicated cron host

## Sign-off

Phase 0 complete when paths are verified in Cursor and hub **Close** has stopped stray dev servers on conflicting ports.
