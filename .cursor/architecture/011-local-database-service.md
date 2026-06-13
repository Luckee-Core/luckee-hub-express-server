# 011 — Local database service

## Status

Accepted

## Context

Some OSS projects (e.g. My Health) use **local Postgres** instead of Supabase. Manual `createdb` + `psql` per repo does not scale when the hub already knows `expressDir` and migration paths.

## Decision

### Registry

Optional `localDatabase` on a `ProjectRegistryEntry`:

```json
{
  "kind": "postgres",
  "databaseName": "my_health",
  "migrationsDir": "migrations",
  "migrationFiles": ["001_....sql", "002_....sql"]
}
```

### Routes

| Method | Path | Role |
|--------|------|------|
| GET | `/api/projects/:id/local-database` | Probe Postgres, DB, schema, `.env` |
| POST | `/api/projects/:id/local-database/setup` | `createdb`, apply migrations, upsert `DATABASE_URL` |

### Implementation

- Service: `src/services/local-database/`
- Shell orchestration only v1 (`pg_isready`, `createdb`, `psql -f`) — no `pg` npm dependency
- `.env` upsert in `expressDir` preserves other keys
- Projects without `localDatabase` return `{ supported: false }`

### Out of scope v1

- Installing Homebrew Postgres
- Supabase provisioning
- SQLite

## Related

- [010 – Projects catalog](./010-projects-catalog-and-rename.md)
