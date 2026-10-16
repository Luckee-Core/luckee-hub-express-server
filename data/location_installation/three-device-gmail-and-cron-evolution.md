# Gmail + local scheduler — three-device evolution

Extends [my-gmail-manager-two-device-deployment.md](./my-gmail-manager-two-device-deployment.md) with a **third role**: dedicated **cron** (local-scheduler) and how it moves off the studio over time.

| Device | Role | Typical processes |
|--------|------|-------------------|
| **1 — Apps** | Browsers / Next.js | `my-gmail-manager-web` |
| **2 — API** | Dispatcher integrations | `my-gmail-manager-express-server` (always-on in Phase 2+) |
| **3 — Storage studio** | Canonical data | Postgres `gmail_manager`, Storage Express `:3010` |

**Platform constraint (current code):** local-scheduler calls workers at `http://127.0.0.1:{port}` only. The machine running the scheduler must run or **spawn** worker Express on that same host. See `local-scheduler-express-server/.cursor/architecture/011-remote-worker-base-url.md` for a possible future override.

---

## Phase 1 — Studio consolidated

Documented in [local-scheduler-studio-deployment.md](./local-scheduler-studio-deployment.md).

- Device 3: storage + scheduler launchd + **spawn** dispatcher for cron.
- Device 1/2: optional; Gmail web may point at studio `:3052` temporarily.

```text
  Scheduler (studio) --spawn--> Dispatcher (studio :3052)
                                      |
                                      v
                              Storage (studio :3010) --> Postgres
```

---

## Phase 2 — Stable API on device 2

**Goal:** Users and OAuth use always-on dispatcher on device 2; storage stays on studio.

### Studio (device 3)

- Postgres + Storage Express (unchanged).
- `STORAGE_BIND_HOST=0.0.0.0`, firewall **3010** ← device 2 IP only.
- Cron may **still** run on studio (spawn local dispatcher) **or** move to device 2 with scheduler.

### Device 2

- Dispatcher `.env`: `STORAGE_EXPRESS_URL=http://<STUDIO_LAN_IP>:3010`, secrets aligned.
- Hub **Run** express + web; no local Postgres for Gmail.

### Device 1

- Web: `NEXT_PUBLIC_EXPRESS_URL` → device 2 (`:3052`), not Next port.

### Cron options in Phase 2

| Option | Scheduler host | Worker spawn | Notes |
|--------|----------------|--------------|-------|
| A | Studio | Spawn dispatcher on studio | Works today; headless cron on studio |
| B | Device 2 | Spawn/use local express | Cron colocated with user API |
| C | Wait for Phase 3 | Dedicated cron Mac | Cleanest long-term |

Bring-up order: storage on studio → `curl` health from device 2 → dispatcher **Run** → web on device 1.

---

## Phase 3 — Dedicated cron host

**Goal:** Move **only** local-scheduler (+ co-located spawned workers) to a third Mac. Storage remains on studio. User-facing API remains on device 2.

```text
  Cron Mac: Scheduler --spawn--> Dispatcher (cron Mac :3052)
                                      |
                                      | LAN secret
                                      v
  Studio: Storage :3010 --> Postgres

  Apps Mac: Web --> Device 2 API (always-on)
```

### Preconditions

- Studio scheduler **stopped** before cutover.
- Cron host: Node 20+, clones for `local-scheduler-express-server` and worker repos (at minimum Gmail dispatcher).
- Dispatcher on cron host: `STORAGE_EXPRESS_URL=http://<STUDIO_LAN_IP>:3010`.

### Migrate `local_scheduler` database

**Preserve history and enabled flags:**

```bash
# studio
pg_dump -Fc local_scheduler > local_scheduler.dump
# cron host
createdb local_scheduler
pg_restore -d local_scheduler local_scheduler.dump
```

**Or re-seed:**

```bash
cd local-scheduler-express-server
npm run db:seed
# PATCH /api/tasks/:id { "enabled": ... } for any local toggles
```

### Config to copy (secure channels)

- `local-scheduler-express-server/.env`
- `scheduler.local.json` (update absolute `expressDir` paths on cron host)
- Dispatcher `.env` on cron host (remote storage URL → studio)
- `./scripts/install-launchd.sh` on cron host

### Cutover checklist

1. `launchctl unload` studio `com.localscheduler.express.plist`.
2. Load launchd on cron host.
3. `./scripts/verify-gmail-pipeline.sh` on cron host.
4. Monitor `GET /api/runs` for 24–48h.
5. Document rollback: unload cron host plist, reload studio plist.

### Fleet rules

- **One** active scheduler launchd per environment.
- Device 2 dispatcher serves **interactive** web traffic; cron host dispatcher is **jobs only** if both exist.
- Browsers never call Storage Express.

---

## Environment matrix (by phase)

| Variable | Phase 1 studio dispatcher | Phase 2 device 2 | Phase 3 cron host dispatcher |
|----------|---------------------------|------------------|------------------------------|
| `STORAGE_EXPRESS_URL` | `http://127.0.0.1:3010` | `http://<studio>:3010` | `http://<studio>:3010` |
| `DATABASE_URL` | omit | omit | omit |
| `GMAIL_MANAGER_CRON_SECRET` | yes | yes (if cron on same host) | yes |

---

## Troubleshooting (multi-device)

| Symptom | Likely cause |
|---------|----------------|
| Two morning syncs | Two schedulers active |
| Cron works, web fails | Wrong `NEXT_PUBLIC_EXPRESS_URL` |
| Cron fails, web works | Cron host secret / storage firewall |
| Scheduler cannot spawn worker | Wrong `expressDir` on cron host |

---

## Related

- [local-scheduler-studio-deployment.md](./local-scheduler-studio-deployment.md)
- [my-gmail-manager-two-device-deployment.md](./my-gmail-manager-two-device-deployment.md)
- `my-gmail-manager/TWO-DEVICE-DEPLOYMENT.md`
