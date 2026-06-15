# 011 — Local database service

## Status

Accepted

## Context

Some OSS projects (e.g. My Health) use **local Postgres** instead of Supabase. Manual `createdb` + `psql` per repo does not scale when the hub already knows `expressDir` and migration paths.

Postgres via Homebrew is **machine-wide** (one service on `127.0.0.1:5432`). Stopping it affects every project using that formula.

## Decision

### Registry

Optional `localDatabase` on a `ProjectRegistryEntry`:

```json
{
  "kind": "postgres",
  "databaseName": "my_health",
  "migrationsDir": "migrations",
  "migrationFiles": ["001_....sql", "002_....sql"],
  "expectedTables": ["hospitals", "..."],
  "postgres": {
    "host": "127.0.0.1",
    "port": 5432,
    "formula": "postgresql@16",
    "installCommand": "brew install postgresql@16",
    "startCommand": "brew services start postgresql@16",
    "stopCommand": "brew services stop postgresql@16"
  }
}
```

- `postgres.installCommand`, `postgres.startCommand`, and `postgres.stopCommand` are optional shell commands the hub can run from the detail page.
- `host` / `port` default to `127.0.0.1:5432` when omitted.

### Routes

| Method | Path | Role |
|--------|------|------|
| GET | `/api/projects/:id/local-database` | Probe Postgres, DB, schema, `.env`; return runnable setup steps |
| POST | `/api/projects/:id/local-database/setup` | Run all currently runnable setup steps in order |
| POST | `/api/projects/:id/local-database/steps/:stepId/run` | Run one setup step by id |
| POST | `/api/projects/:id/local-database/cleanup` | Tab-close cleanup: stop Postgres only if hub started it |

Setup step ids: `postgres-install`, `postgres-start`, `postgres`, `createdb`, `migration-{file}`, `env`, `refresh` (client-side probe only).

**Stop step** (not listed as a setup row): `postgres-stop` — triggered via secondary action on the verify (`postgres`) step when Postgres is running and `stopCommand` is configured.

### Hub session tracking

Express persists hub-started Postgres in `data/local-database-hub-session.json`:

```json
{
  "startedByHub": [
    { "projectId": "my-health", "formula": "postgresql@16", "startedAt": "..." }
  ]
}
```

- **`markPostgresStartedByHub(projectId, formula)`** — after successful `postgres-start` (including via “Run all remaining”)
- **`clearPostgresStartedByHub(projectId)`** — after successful `postgres-stop` or cleanup
- **`wasPostgresStartedByHub(projectId)`** — cleanup handler gate

Start is recorded **only when `postgres-start` succeeds** (that step is not runnable if Postgres was already up).

Probe exposes optional `postgresStartedByHub` for UI hints.

### Verify step secondary action

When Postgres is running and `stopCommand` exists, the `postgres` verify step includes:

- `stoppable: true`
- `stopStepId: 'postgres-stop'`
- `stopActionLabel: 'Stop Postgres'`

No separate list row for stop.

### Tab-close cleanup (hub)

The hub mounts a `pagehide` listener (root layout) that `sendBeacon`s or `fetch(..., { keepalive: true })` to `POST .../local-database/cleanup` when `currentProject.localDatabaseSupported` is true.

Cleanup is **idempotent** and **no-op** when the hub did not start Postgres.

| Action | Stops Postgres? |
|--------|-----------------|
| Click **Stop Postgres** on verify step | Always (explicit user intent) |
| Close hub tab/window | Only if hub ran **Start Postgres** this session |
| Navigate away from detail page | No |
| Refresh hub page | No (session file persists; Postgres stays up) |

### Implementation

- Service: `src/services/local-database/`
- Shell orchestration only (`pg_isready`, `brew`, `createdb`, `psql -f`) — no `pg` npm dependency
- Per-step runners in `src/utils/local-database/run-local-database-step/`
- Session helpers in `src/utils/local-database/postgres-hub-session.ts`
- `.env` upsert in `expressDir` preserves other keys
- Projects without `localDatabase` return `{ supported: false }`

### Out of scope v1

- Supabase provisioning
- SQLite

## Related

- [010 – Projects catalog](./010-projects-catalog-and-rename.md)
