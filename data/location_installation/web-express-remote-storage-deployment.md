# Web → Express API → remote Storage Express (studio)

**Canonical pattern** for apps split into three deployables. The **Express** repo is the product **backend**: OAuth, third-party APIs, AI, cron, and every HTTP route the Next.js app calls. **Storage Express** on another machine (e.g. studio) holds canonical **Postgres CRUD** only. When `STORAGE_MODE=remote`, the API forwards data-layer reads/writes to storage over HTTP; everything else stays on the API host.

| Layer | Typical repo | Role |
|-------|--------------|------|
| **Web** | `{product}-web` (Next.js) | UI; talks to **Express API** only |
| **API** | `{product}-express-server` | Backend for the web — integrations, jobs, business logic; **CRUD** via storage when remote |
| **Storage** | `{product}-storage-express-server` | Canonical Postgres on **one** host; `/api/storage/*` on LAN |

```text
  Browser ──► Express API     OAuth, Gmail, Anthropic, cron, non-DB logic
  Express API ──► Storage     only when a handler needs canonical CRUD (remote mode)
  Storage ──► Postgres        127.0.0.1 on studio
```

**Example product:** [My Gmail Manager](../../../../my-gmail-manager/DEPLOYMENT.md).

Luckee Hub: catalog may list `express`, `web`, `storage-express` — [021 – Storage Express launcher](../../.cursor/architecture/021-storage-express-launcher.md).

> **Env names:** some repos still use `STORAGE_DISPATCHER_SECRET` / “dispatcher” in logs and ADRs. That means **the Express API host** that may call storage, not a separate “dispatcher-only” service.

---

## Rules

1. **One canonical writer** — Postgres on the **storage host** (`127.0.0.1`). Only Storage Express runs SQL there.
2. **Browsers never call storage** — no storage URL in `NEXT_PUBLIC_*`; no Postgres on the LAN.
3. **Remote CRUD** — API host: `STORAGE_MODE=remote`, `STORAGE_EXPRESS_URL`, `STORAGE_EXPRESS_SECRET`; omit `DATABASE_URL` unless you intentionally keep a local DB copy on that Mac.
4. **Network** — open the storage **HTTP** port (e.g. `3010`) from API host IP(s) to studio; **never** expose Postgres **5432** on the LAN.
5. **Shared secrets** — storage `STORAGE_DISPATCHER_SECRET` = API `STORAGE_EXPRESS_SECRET`; shared encryption keys must match wherever ciphertext is read/written.

**Monolith:** API `STORAGE_MODE=local` + local `DATABASE_URL` (one machine, no storage process). This doc is the **split** layout.

---

## Topology

### Storage on studio, UI on another Mac

```text
  Browser on laptop (Next.js :WEB_PORT)
        │
        │  NEXT_PUBLIC_EXPRESS_URL → Express on same Mac
        ▼
  Express API on laptop (:API_PORT)
        │  non-CRUD: Gmail, AI, OAuth, … (local to this process)
        │  CRUD: STORAGE_MODE=remote + x-storage-secret
        ▼
  Storage Express on studio (:STORAGE_PORT)
        ▼
  Postgres on studio
```

### Web UI from studio **and** from another Mac

Run **Express + web** on each Mac you browse from (recommended), same studio `STORAGE_EXPRESS_URL`.

| Where you open the UI | Run Express + web | API `STORAGE_EXPRESS_URL` | API `WEB_APP_ORIGIN` | Web `NEXT_PUBLIC_EXPRESS_URL` |
|----------------------|-------------------|---------------------------|------------------------|-------------------------------|
| **Laptop** | On laptop | `http://<STUDIO_LAN_IP>:<STORAGE_PORT>` | Laptop UI origin | `http://127.0.0.1:<API_PORT>` |
| **Studio** | On studio | `http://127.0.0.1:<STORAGE_PORT>` | Studio UI origin | `http://127.0.0.1:<API_PORT>` |

`localhost` vs `127.0.0.1` are different origins — stay consistent in the browser, `WEB_APP_ORIGIN`, and OAuth redirects.

**Alternative:** one Express on studio; laptop web uses `NEXT_PUBLIC_EXPRESS_URL=http://<STUDIO_LAN_IP>:<API_PORT>` and studio `WEB_APP_ORIGIN` must allow the laptop origin (CORS).

---

## Shared secret (once per product)

```bash
openssl rand -base64 32
```

| Host | Variable |
|------|----------|
| Storage `.env` | `STORAGE_DISPATCHER_SECRET` |
| Each API `.env` | `STORAGE_EXPRESS_SECRET` (same value) |

Other keys: each repo’s `.env.example`.

---

## Part A — Storage host (studio)

Clone `{product}-storage-express-server`; `npm install`.

```bash
createdb YOUR_DB_NAME
export DATABASE_URL=postgresql://USER@127.0.0.1:5432/YOUR_DB_NAME
psql "$DATABASE_URL" -f migrations/setup.sql
```

Apply further migrations per product. `DATABASE_URL` here is **localhost only**.

| Variable | Purpose |
|----------|---------|
| `PORT` | Often `3010` |
| `STORAGE_BIND_HOST` | `0.0.0.0` for LAN API hosts; `127.0.0.1` if API always on studio |
| `DATABASE_URL` | Local Postgres |
| `STORAGE_DISPATCHER_SECRET` | Shared with API hosts |

```bash
curl -s "http://127.0.0.1:<STORAGE_PORT>/api/storage/health"
curl -s -H "x-storage-secret: $STORAGE_DISPATCHER_SECRET" \
  "http://<STUDIO_LAN_IP>:<STORAGE_PORT>/api/storage/health"   # from API Mac
```

Firewall: storage HTTP port from API host IPs; not **5432**.

Typical storage routes: health (public), meta + `v1/invoke` (secret), product-specific worker credentials / seed export. Header: **`x-storage-secret`**. Deploy storage when API data-layer operations change.

---

## Part B — Express API (each Mac running the backend)

### Remote storage for CRUD

| Variable | Notes |
|----------|--------|
| `PORT` | API port |
| `STORAGE_MODE` | `remote` |
| `STORAGE_EXPRESS_URL` | Studio LAN IP from remote Mac; `127.0.0.1` on studio |
| `STORAGE_EXPRESS_SECRET` | Matches storage secret |
| `WEB_APP_ORIGIN` | Next.js origin on **this** Mac |
| `DATABASE_URL` | Omit for remote-only CRUD |
| Product keys | OAuth → **this** API; API keys; AI; etc. |

Never point API `DATABASE_URL` at studio Postgres over the network.

Startup should log remote storage and that local `DATABASE_URL` is not required for canonical CRUD.

Optional: local `DATABASE_URL` + admin seed-from-storage on some products — not required for normal use.

```bash
curl -s "http://127.0.0.1:<API_PORT>/api/health"
```

---

## Part C — Web (Next.js)

```env
NEXT_PUBLIC_EXPRESS_URL=http://127.0.0.1:<API_PORT>
```

API port only — not Next dev port, not Storage Express. Off-LAN: expose **API** only, not storage.

---

## Part D — Luckee Hub

`hub.local.json`: same paths as Cursor (`expressDir`, `webDir`, `storageExpressDir`).

| Action | Machine |
|--------|---------|
| Postgres, migrations, **Storage** Start | Storage host |
| **Run** (Express + web) | Macs where you develop or browse |

Checklist: [studio-deployment-inventory.template.md](./studio-deployment-inventory.template.md).

---

## Bring-up order

1. Studio: Postgres → migrations → storage → Storage Express up.
2. From API Mac: `curl` storage with secret.
3. API `.env` → Express up.
4. Web `NEXT_PUBLIC_EXPRESS_URL` → open UI.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Postgres pool errors on API host | Monolith config or wrong clone | `STORAGE_MODE=remote` + URL + secret; omit `DATABASE_URL` |
| `Storage auth is not configured` | Storage secret / wrong cwd | Storage `.env`; `storageExpressDir` |
| `Unauthorized` from storage | Secret mismatch | Align secret env vars |
| Connection refused to storage | IP, firewall, bind | `STORAGE_BIND_HOST=0.0.0.0`; allow port |
| `Storage missing operation` | Storage behind API deploy | Update storage; migrations; restart |
| CORS | Origin mismatch | `WEB_APP_ORIGIN` |
| Web hits wrong port | Env | `NEXT_PUBLIC_EXPRESS_URL` → API port |
| `.env` ignored | Duplicate clones | `hub.local.json` paths |

---

## Moving storage

New studio host → migrate DB → align secrets → `curl` from each API Mac → update `STORAGE_EXPRESS_URL` → stop old storage.

---

## Security

- Storage HTTP from known API host IPs only.
- Do not commit `.env`.
- Remote users: TLS on API, not on storage Postgres.

---

## Product instances

| Product | Guide |
|---------|--------|
| My Gmail Manager | [DEPLOYMENT.md](../../../../my-gmail-manager/DEPLOYMENT.md) |
| Hub checklist (Gmail) | [my-gmail-manager-two-device-deployment.md](./my-gmail-manager-two-device-deployment.md) |
