# Architecture Documentation

ADRs for **luckee-hub-express-server** (forked from express-server-template).

## ADR index

### Shared conventions (001–007, 016)

1. [001 – File & service organization](./001-file-and-service-organization.md) — `src/data/{table}/` CRUD only; `src/services/{feature}/` for HTTP and business logic. **No `src/domains/`.**
2. [002 – Router factory & handler pattern](./002-router-factory-and-handler-pattern.md) — Thin routers, handlers, `processX()`.
3. [003 – Data layer CRUD boundaries](./003-data-layer-crud-boundaries.md) — One table folder, one function per file.
4. [004 – Managed clients & startup init](./004-managed-clients-and-startup-init.md) — Startup init, accessors.
5. [005 – Edge functions & Railway boundaries](./005-edge-functions-railway-only.md) — Edge → Railway only.
6. [006 – Logging & error response standards](./006-logging-and-error-response-standards.md) — Emoji logging, response shape.
7. [007 – Starter template layout](./007-starter-template-layout.md) — Shipped `src/services/` tree.
16. [016 – Domain models (`src/model`)](./016-domain-models.md) — table row + write-input types; never `src/data/{table}/types.ts`.

### Product ADRs

8. [008 – Local launcher service](./008-local-launcher-service.md) — `127.0.0.1` bind, launcher API, projects naming.
9. [009 – Embedded terminal service](./009-embedded-terminal-service.md) — `node-pty`, WebSocket, bottom-dock PTYs.
10. [010 – Projects catalog and rename](./010-projects-catalog-and-rename.md) — `projects.registry.json`, `/api/projects`.
11. [011 – Local database service](./011-local-database-service.md) — Postgres probe/setup for hooked-up projects.
12. [012 – Project setup into luckee/](./012-project-setup-into-luckee.md) — Clone + npm install, `luckeeParent`, Setup job.
13. [013 – Supabase config service](./013-supabase-config-service.md) — Upsert Supabase keys into express `.env` from Hub.
14. [014 – Express env groups](./014-express-env-groups.md) — AI / Maps / Email env tabs upserting express `.env`.
15. [015 – API runtime detection](./015-api-runtime-detection.md) — Node vs Python API repos.
16. [016 – System metrics service](./016-system-metrics-service.md) — CPU/GPU + top processes (Apple Silicon).
21. [021 – Storage Express launcher](./021-storage-express-launcher.md) — `storage-express` repo, launcher routes, local DB `envRepo`.
22. [022 – Scheduler worker log terminals](./022-scheduler-worker-log-terminals.md) — `tail -F` PTYs from local-scheduler `/api/workers`.

## How to use

1. Open the ADR for your feature.
2. Follow the patterns exactly.
3. Add ADRs when decisions change and update this index.
