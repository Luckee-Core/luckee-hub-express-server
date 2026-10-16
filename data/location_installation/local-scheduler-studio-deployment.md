# Local Scheduler — Mac Studio deployment (Phase 1)

Catalog id: **`local-scheduler`** (`data/projects.registry.json`).

Use this when the **Mac Studio** runs **canonical Gmail storage** (Postgres + Storage Express) and **local-scheduler** as the cron daemon. The scheduler calls worker Express apps on **the same machine** (`127.0.0.1`); for Gmail it typically **spawns** `my-gmail-manager-express-server`, runs the job, then stops it if it started the process.

**Hub install checklist:** [README.md](./README.md)

**Gmail storage on studio:** [my-gmail-manager-two-device-deployment.md](./my-gmail-manager-two-device-deployment.md) (storage host sections)

**Later phases (API on another Mac, dedicated cron host):** [three-device-gmail-and-cron-evolution.md](./three-device-gmail-and-cron-evolution.md)

**Phase 0:** Copy [studio-deployment-inventory.template.md](./studio-deployment-inventory.template.md) and fill in paths/ports before changing production.

**Hub paths:** [hub-local-json-studio-notes.md](./hub-local-json-studio-notes.md)

---

## At a glance

| Component | Always-on? | Port (hub default) | Postgres DB |
|-----------|------------|--------------------|-------------|
| Storage Express | Yes | 3010 | `gmail_manager` (storage repo) |
| Local scheduler Express | Yes (launchd) | **3022** | `local_scheduler` |
| Gmail dispatcher Express | No (spawn per job) | 3052 | none (`STORAGE_MODE=remote`) |
| Local scheduler web | Optional | 3023 | none |
| Gmail web | Optional on studio | 3053 | none |

**Fleet rule:** Exactly **one** machine runs an active scheduler launchd for this environment.

---

## Prerequisites

1. [README Step 1](./README.md#step-1--install-postgresql) — Postgres 16 on studio.
2. Hub `hub.local.json` with correct `luckeeParent` and path overrides (see [One checkout tree](./my-gmail-manager-two-device-deployment.md#one-checkout-tree-per-machine-critical)).
3. `my-gmail-manager` **Local database** completed for **storage-express** (`gmail_manager`).
4. `local-scheduler` **Local database** completed for **express** (`local_scheduler`) — or run `scripts/setup-studio-db.sh` in the `local-scheduler-express-server` repo.

---

## Step 1 — `local_scheduler` database

### Hub UI

**Project detail → Local database → Setup database** (after registry includes `localDatabase` for `local-scheduler`).

### Manual

```bash
cd /path/to/local-scheduler-express-server
./scripts/setup-studio-db.sh
```

Then seed task catalog:

```bash
npm run db:seed
```

---

## Step 2 — Storage Express (studio)

1. Storage repo `.env`: `DATABASE_URL`, `STORAGE_DISPATCHER_SECRET`, `TOKEN_ENCRYPTION_KEY`.
2. Phase 1 loopback only: `STORAGE_BIND_HOST=127.0.0.1`.
3. Phase 2+ (remote dispatcher): `STORAGE_BIND_HOST=0.0.0.0` and firewall **3010** to API Mac IP only — **never** expose **5432**.

Hub: **my-gmail-manager → Storage → Start**.

Smoke:

```bash
curl -s -H "x-storage-secret: YOUR_SECRET" http://127.0.0.1:3010/api/storage/health
```

---

## Step 3 — Scheduler configuration

### `scheduler.local.json` (gitignored)

Copy from `scheduler.local.json.example` in the scheduler repo. Minimum for Gmail:

```json
{
  "workers": {
    "my-gmail-manager": {
      "expressDir": "/absolute/path/to/my-gmail-manager-express-server",
      "port": 3052,
      "nvmSh": "/opt/homebrew/opt/nvm/nvm.sh"
    }
  }
}
```

Add other `workerProjectId` keys from `data/tasks.registry.json` (e.g. `philly-ai-consulting`).

### Scheduler `.env`

Copy `.env.example`. Required:

| Variable | Purpose |
|----------|---------|
| `PORT` | **3022** (matches hub catalog) |
| `DATABASE_URL` | `postgresql://USER@127.0.0.1:5432/local_scheduler` |
| `GMAIL_MANAGER_CRON_SECRET` | Same value as dispatcher `.env` |
| `PHILLY_AI_CONSULTING_CRON_SECRET` | If that worker is enabled |

Worker cron secrets must exist in **scheduler** `.env` (`authEnvKey` on each task).

### Gmail dispatcher `.env` (spawn target)

On the **same Mac** as the scheduler. Use product doc:

- `my-gmail-manager-express-server/STUDIO-DISPATCHER-SETUP.md`
- `my-gmail-manager-express-server/.env.studio-cron.example` (studio loopback storage)

Phase 1 highlights:

- `STORAGE_MODE=remote`
- `STORAGE_EXPRESS_URL=http://127.0.0.1:3010`
- `STORAGE_EXPRESS_SECRET` = storage `STORAGE_DISPATCHER_SECRET`
- `GMAIL_MANAGER_CRON_SECRET` = scheduler value
- **No** `DATABASE_URL`

---

## Step 4 — launchd (production cron)

From `local-scheduler-express-server`:

```bash
./scripts/install-launchd.sh
```

The plist runs `npm start` from the repo root so `dotenv` loads `.env` (`DATABASE_URL`, secrets).

Logs: `~/Library/Logs/local-scheduler/express.out.log`

Unload:

```bash
launchctl unload ~/Library/LaunchAgents/com.localscheduler.express.plist
```

**Do not** use hub **Run** for 24/7 cron unless you accept dev-mode only. Hub **Run** is fine for debugging.

---

## Step 5 — Verify

```bash
cd /path/to/local-scheduler-express-server
./scripts/verify-gmail-pipeline.sh
```

Or manually:

```bash
curl -s http://127.0.0.1:3022/api/health
curl -s -X POST http://127.0.0.1:3022/api/tasks/gmail-manager-morning-inbox/run-now
curl -s "http://127.0.0.1:3022/api/runs?limit=5"
```

Worker spawn log: `/tmp/local-scheduler/workers/my-gmail-manager.log` (or `SCHEDULER_WORKERS_DIR`).

---

## Optional — scheduler web (studio desktop only)

```bash
cd local-scheduler-web
# NEXT_PUBLIC_API_URL=http://127.0.0.1:3022
npm run dev
```

Bind is local; do not expose on LAN. Not required on laptops used only for Gmail UI.

---

## Hub vs launchd

| Mode | Scheduler | Gmail Express |
|------|-----------|---------------|
| **Production** | launchd | Spawn/stop per job |
| **Dev** | hub **Run** on local-scheduler | hub **Run** on gmail — scheduler may **not** stop hub-started workers |

Before relying on spawn/stop, **Close** gmail project in hub to free port 3052.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Scheduler health `database: unavailable` | `DATABASE_URL` in repo `.env`; Postgres running |
| Task failed: no `expressDir` | `scheduler.local.json` worker key must match `workerProjectId` |
| Worker unhealthy 120s | Read worker log under `SCHEDULER_WORKERS_DIR` |
| HTTP 401/403 on job | Align `GMAIL_MANAGER_CRON_SECRET` |
| Port 3022 in use | hub Close local-scheduler or change `PORT` everywhere |
| Duplicate morning sync | Second scheduler launchd on another Mac |

---

## Related

| Resource | Location |
|----------|----------|
| Scheduler product README | `local-scheduler-express-server/README.md` |
| ADR 009 | `local-scheduler-express-server/.cursor/architecture/009-local-scheduler-service.md` |
| Gmail jobs ADR 018–019 | `my-gmail-manager-express-server/.cursor/architecture/` |
