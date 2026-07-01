# Luckee Hub port allocation

## Reserved infrastructure

| Port | Service |
|------|---------|
| 3000 | Luckee Hub web (`luckee-hub`) |
| 3001 | Luckee Hub express API (`luckee-hub-express-server`) |
| 5432 | Local Postgres (my-health only) |

## Project preferred ports (3010+)

Projects use **preferred** API and web ports defined in:

- [`data/projects.registry.json`](../data/projects.registry.json)
- [`luckee-hub/src/config/hub-catalog.ts`](../../luckee-hub/src/config/hub-catalog.ts) (web mirror)

Ports are assigned in catalog order (+2 per full-stack app). There is **no maximum** — append new projects at the end (e.g. after 3043 → 3044 API / 3045 web).

Run `npm run suggest:ports` to print the next suggested pair.

## Hub Run vs manual dev

**Canonical path:** use **Run** in Luckee Hub. The launcher:

1. Sets `PORT` on Express and Next.js PTYs (strips hub `PORT` so it never leaks)
2. Scans +10 for the first **free** port if the preferred port is busy (`findAvailableApiPort` / `findAvailableWebPort`) when **starting** servers
3. Detects already-running Next.js only on the assigned port — never by scanning ahead to another project's dev server
4. Injects API URL env vars: `NEXT_PUBLIC_SERVER_URL`, `NEXT_PUBLIC_API_URL`, `EXPRESS_API_URL`
5. Writes resolved ports to `/tmp/luckee-hub/<projectId>-ports.json`

**Manual `npm run dev`** outside hub uses each repo’s `.env` fallback. Mismatches are possible — prefer hub Run for local work.

## Adding a new project

1. `npm run suggest:ports` — get next API/web pair
2. Add entry to `projects.registry.json` and `hub-catalog.ts`
3. Add paths to `hub.local.json.example` and your local `hub.local.json`
4. `npm run validate:ports` — must pass (no duplicates, no hub collision)

## Non-hub apps

Apps not in the hub catalog (e.g. `luckee-marketing`) should use ports **outside** the project catalog range or a dedicated band (e.g. 3100+) to avoid collisions.

## Validation

```bash
npm run validate:ports
```
