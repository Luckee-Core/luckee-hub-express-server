# 013 — Supabase config service (express `.env` upsert + schema seed)

## Status

Accepted

## Context

Lead Studio and similar OSS apps need Supabase credentials in the Express repo `.env`. Users should paste URL, service_role key, and database password on the Hub project-detail page instead of editing files by hand. Hub must not store secrets long-term — only write them to the cloned express `.env` (same pattern as local Postgres `DATABASE_URL`).

After keys are present, users need a one-click way to apply the project's bootstrap SQL (`supabase.bootstrapSql`) to the remote Supabase Postgres (instead of pasting into the SQL Editor).

## Decision

### Registry

Optional `supabase` on a `ProjectRegistryEntry`:

```json
{
  "bootstrapSql": "sql/000_full_schema_bootstrap.sql",
  "expectedTables": ["leads", "lead_contacts"],
  "envKeys": ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "DATABASE_URL"]
}
```

List projects exposes `supabaseSupported: !!entry.supabase`.

### Routes

| Method | Path | Role |
|--------|------|------|
| GET | `/api/projects/:id/supabase` | Probe: key presence + `schemaReady` (expected tables via `psql` + `DATABASE_URL`) |
| POST | `/api/projects/:id/supabase/config` | Body: `supabaseUrl`, `serviceKey`, `databasePassword` → upsert express `.env` |
| POST | `/api/projects/:id/supabase/seed-schema` | Always run `bootstrapSql` with `psql` against `DATABASE_URL` (idempotent DDL + seed inserts; do not skip when tables already exist) |

Also writes `SUPABASE_DATABASE_PASSWORD` and builds `DATABASE_URL` as:

`postgresql://postgres:{encodedPassword}@db.{ref}.supabase.co:5432/postgres?sslmode=require`

Seed requires `psql` on the machine and a working `DATABASE_URL` in express `.env`.

### Run gate

`processEnsureSupabaseConfigForRun` runs before spawning PTYs. If `supabase` is on the registry and keys are incomplete, Run fails with a message pointing at the detail page.

### Storage

| Place | Secrets? |
|-------|----------|
| Express repo `.env` | Yes — source of truth |
| Hub Redux / probe API | No — booleans only |
| `hub.local.json` | No |

## Related

- [011 – Local database service](./011-local-database-service.md)
- [010 – Projects catalog](./010-projects-catalog-and-rename.md)
