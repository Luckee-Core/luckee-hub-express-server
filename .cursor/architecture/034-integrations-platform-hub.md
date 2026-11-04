# 034 — Integrations platform (Hub registry Phase 0)

## Status

Accepted

## Context

Luckee is adding an **Integration Manager** product (storage + API + web) and a **Postgres-backed On-device Express dispatcher** stack (gateway DB `express_gateway`, optional storage-express). **Make It Sound Like Me** is gaining a storage-express repo and gateway env for on-device storage access while Supabase bootstrap remains for transitional setups.

Hub must list these projects in `data/projects.registry.json` with non-conflicting ports, local-database metadata, and express env groups before repos ship migrations or launcher wiring.

## Decision

### Registry entries

| Project id | Storage API | Express API | Web | Postgres DB |
|------------|-------------|-------------|-----|-------------|
| `integration-manager` | 3098 | 3099 | 3100 | `integration_manager` (`envRepo`: storage-express) |
| `on-device-express-dispatcher` | 3101 | 3102 | 3103 | `express_gateway` (`envRepo`: express; migrations aligned with legacy `on-device-dispatcher-express-server`) |
| `make-it-sound-like-me` | **3083** (new) | 3071 | 3072 | `make_it_sound_like_me` on storage-express; Supabase block unchanged |

### Express env groups

- **integration-manager** — `storage`: `INTEGRATION_MANAGER_STORAGE_URL`, `INTEGRATION_MANAGER_STORAGE_SECRET`, `CANONICAL_DATA_ACCESS_MODE`, `STORAGE_REQUEST_TIMEOUT_MS`.
- **make-it-sound-like-me** — add `gateway`: `ON_DEVICE_DISPATCHER_GATEWAY_URL`, `DISPATCHER_GATE_SECRET`, `MISLM_STORAGE_ACCESS_MODE`, `MISLM_STORAGE_DIRECT_URL` (keep existing `ai` group).
- **on-device-express-dispatcher** — `gateway` keys for studio bind/spawn (same family as legacy `on-device-dispatcher`).

### Hub web catalog

Mirror registry rows in `luckee-hub/src/config/hub-catalog.ts` with `localDatabaseSupported` / `supabaseSupported` / `expressEnvGroupIds` matching the finances-manager pattern.

### Local paths

`hub.local.json.example` includes `integration-manager` and `on-device-express-dispatcher` under `projects` with `storageExpressDir` where applicable.

### Phase 0 caveats

- `integration-manager` and MISLM storage may ship **empty** `migrationFiles` until SQL lands; `expectedTables` document the target schema for Hub probes.
- `on-device-express-dispatcher-storage-express-server` may not exist on disk yet; registry still reserves port **3101**.

## Related

- [010 – Projects catalog and rename](./010-projects-catalog-and-rename.md)
- [011 – Local database service](./011-local-database-service.md)
- [021 – Storage Express launcher](./021-storage-express-launcher.md)
- [014 – Express env groups](./014-express-env-groups.md)
