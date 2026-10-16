# My Gmail Manager — storage host + dispatcher (two Macs)

Catalog id: **`my-gmail-manager`** (`data/projects.registry.json`).

Use this when **canonical Postgres and Storage Express** run on one Mac (e.g. **studio**) and **dispatcher Express + web UI** run on another (e.g. **laptop**). The hub on each machine still uses the same catalog entry; what differs is **which processes you start** and **which `.env` files you maintain**.

**Hub install checklist (any machine):** [README.md](./README.md)

**Architecture in hub repo:** [021 – Storage Express launcher](../../.cursor/architecture/021-storage-express-launcher.md)

---

## At a glance

| Mac | Hub actions | Processes | Local Postgres |
|-----|-------------|-----------|----------------|
| **Storage host** (studio) | Local database → Setup; **Storage** → Start | `my-gmail-manager-storage-express-server` `:3010` | **Yes** — `gmail_manager` (`envRepo: storage-express`) |
| **Dispatcher host** (laptop) | Express env → Storage group; **Run** | `my-gmail-manager-express-server` `:3052`, web `:3053` | **No** — `STORAGE_MODE=remote` |

```text
  Browser (dispatcher Mac, Next ~:3053)
        │  NEXT_PUBLIC_EXPRESS_URL → :3052
        ▼
  Dispatcher Express (dispatcher Mac)
        │  STORAGE_EXPRESS_URL + x-storage-secret
        ▼
  Storage Express (storage Mac :3010)
        ▼
  Postgres 127.0.0.1 (storage Mac only)
```

Browsers never call Storage Express or remote Postgres.

---

## One checkout tree per machine (critical)

Point **`hub.local.json`** at the repos you actually edit (not a stale second clone).

Registry **Setup** defaults to:

```text
{luckeeParent}/luckee/my-gmail-manager/{repoName}
```

If you develop under `~/github/my-gmail-manager/`, override paths in **`luckee-hub-express-server/hub.local.json`**:

```json
"my-gmail-manager": {
  "webDir": "/Users/you/github/my-gmail-manager/my-gmail-manager-web",
  "expressDir": "/Users/you/github/my-gmail-manager/my-gmail-manager-express-server",
  "storageExpressDir": "/Users/you/github/my-gmail-manager/my-gmail-manager-storage-express-server"
}
```

Restart **hub-express** after edits. **Close** → **Run** / **Storage** so terminals reload `.env` from those directories.

See [012 – Project setup into luckee/](../../.cursor/architecture/012-project-setup-into-luckee.md).

---

## Ports (registry defaults)

| Repo | `repoType` | Default port |
|------|------------|--------------|
| `my-gmail-manager-storage-express-server` | `storage-express` | `3010` |
| `my-gmail-manager-express-server` | `express` | `3052` |
| `my-gmail-manager-web` | `nextjs` | `3053` (`webPortStart`) |

---

## Shared secret (both Macs)

Generate once:

```bash
openssl rand -base64 32
```

| Machine | File | Variable |
|---------|------|----------|
| Storage host | `my-gmail-manager-storage-express-server/.env` | `STORAGE_DISPATCHER_SECRET` |
| Dispatcher host | `my-gmail-manager-express-server/.env` | `STORAGE_EXPRESS_SECRET` |

Same value both sides. Hub **Overview → Storage** tab upserts dispatcher keys (`STORAGE_MODE`, `STORAGE_EXPRESS_URL`, `STORAGE_EXPRESS_SECRET`) into **express** `.env` only.

`TOKEN_ENCRYPTION_KEY` must also match on storage and dispatcher.

---

## Storage host (studio) — checklist

1. **Postgres** — [README step 1](./README.md#step-1--install-postgresql); hub **Local database** targets **storage-express** (`localDatabase.envRepo` in registry).
2. **Clone / paths** — storage repo on this Mac; `storageExpressDir` correct in `hub.local.json`.
3. **`.env`** — see `my-gmail-manager-storage-express-server/STORAGE-HOST-SETUP.md` and `.env.example` in that repo:
   - `DATABASE_URL` → local `gmail_manager`
   - `STORAGE_BIND_HOST=0.0.0.0` (LAN dispatchers)
   - `STORAGE_DISPATCHER_SECRET`, `TOKEN_ENCRYPTION_KEY`
4. **Hub** — Project detail → **Storage** → **Start** (or `npm run dev` in storage repo).
5. **Firewall** — allow TCP **3010** from dispatcher Mac IP; do **not** expose Postgres **5432**.
6. **Smoke** (from dispatcher Mac later):

   ```bash
   curl -s -H "x-storage-secret: YOUR_SECRET" \
     "http://<STUDIO_LAN_IP>:3010/api/storage/health"
   ```

Product detail: **`my-gmail-manager-storage-express-server/STORAGE-HOST-SETUP.md`**

---

## Dispatcher host (laptop) — checklist

1. **Postgres** — **not required** for remote dispatcher (skip Local database on laptop unless you want an optional local copy).
2. **Clone / paths** — express + web on this Mac; `expressDir` / `webDir` in `hub.local.json`.
3. **`.env`** — see `my-gmail-manager-express-server/STUDIO-DISPATCHER-SETUP.md` and `.env.example` in that repo:
   - `STORAGE_MODE=remote`
   - `STORAGE_EXPRESS_URL=http://<STUDIO_LAN_IP>:3010`
   - `STORAGE_EXPRESS_SECRET` (= storage `STORAGE_DISPATCHER_SECRET`)
   - **Omit** `DATABASE_URL`
   - `GOOGLE_*`, `WEB_APP_ORIGIN`, `ANTHROPIC_API_KEY`, API keys
4. **Hub** — Overview → **Storage** env group filled; project list → **Run** (express + web; does **not** start storage on laptop).
5. **Web** — `NEXT_PUBLIC_EXPRESS_URL=http://127.0.0.1:3052` (dispatcher port, not Next port). Hub sets this when spawning the web terminal if express is on `:3052`.
6. **Startup log** (express terminal):

   ```text
   ✅ [storage] Canonical data: REMOTE → http://…:3010
   ```

Product detail: **`my-gmail-manager-express-server/STUDIO-DISPATCHER-SETUP.md`**

ADR: **`my-gmail-manager-express-server/.cursor/architecture/020-storage-dispatcher-split.md`**

---

## Bring-up order

1. Storage host: Postgres + migrations + storage `.env` + **Storage Start**.
2. Dispatcher host: verify `curl` to studio `:3010` with secret.
3. Dispatcher host: express `.env` + **Run**.
4. Open web URL from hub (or `http://127.0.0.1:3053`).

---

## Moving canonical storage to studio (one-time)

**`my-gmail-manager-express-server/PHASE2-STUDIO-AS-STORAGE.md`** — `pg_dump` / `pg_restore`; update all dispatchers’ `STORAGE_EXPRESS_URL`; do not `dropdb` on either side casually.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| `Postgres pool not configured` on laptop express | Wrong `expressDir` / old clone; not in remote mode | Fix `hub.local.json`; set `STORAGE_MODE=remote` + URL + secret in **that** express `.env` |
| `Storage auth is not configured` | Storage process has no `STORAGE_DISPATCHER_SECRET` | Fix storage `.env` on **studio**; restart Storage from hub |
| `Unauthorized` from storage | Secret mismatch | Align secrets on both Macs |
| 500s on dashboard API | Storage down, wrong IP, or firewall | `curl` health from laptop; fix `STORAGE_EXPRESS_URL` |
| UI hits `:3053/api/gmail` | Web points at Next port | `NEXT_PUBLIC_EXPRESS_URL` → `:3052` |
| `.env` changes ignored | Hub running other clone | Align paths; restart hub-express + terminals |

More tables in product docs:

- `my-gmail-manager-express-server/STUDIO-DISPATCHER-SETUP.md` § Troubleshooting
- `my-gmail-manager-storage-express-server/STORAGE-HOST-SETUP.md` § Troubleshooting
- `my-gmail-manager/TWO-DEVICE-DEPLOYMENT.md` (product-folder overview, same content)

---

## Related

| Resource | Location |
|----------|----------|
| Hub catalog entry | `data/projects.registry.json` → `my-gmail-manager` |
| Storage launcher ADR | `.cursor/architecture/021-storage-express-launcher.md` |
| Local DB on storage repo | `localDatabase.envRepo: "storage-express"` |
| Location install master | [README.md](./README.md) |
