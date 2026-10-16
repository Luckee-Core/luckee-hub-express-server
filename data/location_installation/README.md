# Luckee Hub — location installation manual

This folder is the **on-machine installation guide** for running Luckee Hub and hub-managed projects at a given location (your Mac Studio, a dev laptop, etc.). Content here is meant to be read by humans and referenced from product docs over time.

Use this as a **checklist**: complete each step in order on a fresh machine, or use the hub UI where noted (the hub automates the same operations).

---

## At a glance

| Step | Topic | Hub UI (after step 4) | Manual fallback |
|------|--------|------------------------|-----------------|
| 1 | PostgreSQL 16 | Local database → Install / Start | `brew`, `createdb`, `psql` |
| 2 | Homebrew, Git, Node (`nvm`) | Setup + Run use `nvmSh` | Install tools yourself |
| 3 | Hub repos + `luckeeParent` | Projects header → pick folder | Clone siblings, edit `hub.local.json` |
| 4 | Hub Express + Web | Desktop app or `luckeehub` | `npm run dev` in both repos |
| 5 | Per-project clone + env | Setup + Overview tabs | `git clone`, `npm install` |
| 6 | Optional: Storage, Cursor, Chrome | Run / Open Cursor / Open Chrome | [Gmail two-device](./my-gmail-manager-two-device-deployment.md), other product docs |

---

## Step 1 — Install PostgreSQL

### Why this is first

- Catalog projects with `localDatabase.kind: "postgres"` expect Postgres on **`127.0.0.1:5432`** (unless the registry overrides host/port).
- The hub’s **Local database** flow runs: `postgres-install` → `postgres-start` → verify → `createdb` → migrations → write `DATABASE_URL` → refresh. Those steps need **`psql` / `createdb` on PATH** and a running server (or installable via Homebrew on macOS).
- **Run** on a Postgres-backed project calls the same setup automatically before spawning dev servers (ADR 011).

### macOS (Homebrew) — recommended

The registry defaults to **PostgreSQL 16**:

```bash
brew install postgresql@16
brew services start postgresql@16
```

**Put client tools on your PATH** (required for terminal use and for the hub’s shell steps):

```bash
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

On Intel Macs, use `/usr/local/opt/postgresql@16/bin` instead of `/opt/homebrew/...`.

Verify:

```bash
psql postgres -c "SELECT version();"
```

### Manual database bootstrap (optional)

You do **not** have to create per-project databases before opening the hub. After Postgres is running, use **Project detail → Local database → Setup database** (or run steps one at a time).

If you prefer the shell (same outcome as hub steps `createdb` + `migration-*`):

```bash
createdb gmail_manager   # example; name comes from registry `databaseName`
export DATABASE_URL="postgresql://$(whoami)@127.0.0.1:5432/gmail_manager"
psql "$DATABASE_URL" -f migrations/setup.sql
```

Migration paths and files are defined per project in `data/projects.registry.json` (`migrationsDir`, `migrationFiles`). Some projects write `DATABASE_URL` to the **storage-express** repo (registry `envRepo: "storage-express"`), not the main API repo.

### Other platforms

Linux and Windows paths are not fully documented here yet. Install PostgreSQL 16 (or compatible), listen on localhost, confirm with `psql`, then use hub Local database setup or manual `createdb` / `psql -f`.

### Postgres lifecycle with the hub

- One Homebrew Postgres service is **shared** across all hub projects on the machine.
- **Close** on the projects list (or closing the hub tab with an active Postgres consumer) may run `brew services stop postgresql@16` **only if** the hub started Postgres and no other project is still using it (ADR 011).
- Explicit **Stop Postgres** on the verify step always stops the service.

---

## Step 2 — Homebrew, Git, and Node.js

Required for cloning catalog repos, `npm install` during **Setup**, and embedded dev terminals.

### Homebrew

Install from [https://brew.sh](https://brew.sh) if missing:

```bash
brew --version
```

### Git + GitHub access

- Install Git (`xcode-select --install` on macOS, or `brew install git`).
- Ensure you can clone from **Luckee-Core** (SSH keys or HTTPS + credential helper).

### Node.js via nvm (recommended)

Hub **Setup** and **Run** prefix commands with `nvmSh` from `hub.local.json` (see `hub.local.json.example`). Typical Homebrew nvm install:

```bash
brew install nvm
mkdir -p ~/.nvm
# Follow brew’s caveats to source nvm in ~/.zshrc
nvm install --lts
nvm use --lts
node --version
npm --version
```

Set `nvmSh` to your `nvm.sh` path, e.g. `/opt/homebrew/opt/nvm/nvm.sh` or `$HOME/.nvm/nvm.sh`.

---

## Step 3 — Clone Luckee Hub and set `luckeeParent`

### Clone hub repos as siblings

```bash
cd ~/github   # or your preferred parent — this becomes luckeeParent
git clone <luckee-hub-url> luckee-hub
git clone <luckee-hub-express-server-url> luckee-hub-express-server
cd luckee-hub && npm install
cd ../luckee-hub-express-server && npm install
```

If the repos are not siblings, set **`LUCKEE_HUB_WEB_DIR`** and **`LUCKEE_HUB_EXPRESS_DIR`** when using the desktop launcher or `luckeehub` CLI (see `luckee-hub/README.md`).

### Machine config (`hub.local.json`)

Lives in **`luckee-hub-express-server/hub.local.json`** (gitignored). Example fields: `hub.local.json.example`.

| Field | Purpose |
|--------|---------|
| `luckeeParent` | Absolute path to the folder that contains **`luckee/`** (ADR 012) |
| `nvmSh` | Path to `nvm.sh` for install/run shells |
| `cursorBin` | Optional; **Open Cursor** on project detail |
| `projects.{id}` | Per-project paths, ports — usually written by **Setup**, not by hand |

**In the hub UI:** set `luckeeParent` via the projects header (folder picker on macOS). Required before **Setup** on any catalog project.

### Clone path convention for catalog projects

Setup clones into:

```text
{luckeeParent}/luckee/{projectId}/{repoName}
```

Example:

```text
/Users/you/github/luckee/my-gmail-manager/my-gmail-manager-express-server
```

Legacy layouts under `{luckeeParent}/{projectId}/` may still work if already present in `hub.local.json`; new Setup uses the `luckee/` segment.

---

## Step 4 — Run Luckee Hub Express + Web

Default ports: **Web `3000`**, **Hub Express `3001`** (`NEXT_PUBLIC_API_URL=http://127.0.0.1:3001` in `luckee-hub/.env.example`).

### Option A — Desktop launcher (macOS / Windows)

From `luckee-hub`:

```bash
npm run dev:desktop
```

Double-click **Luckee Dev Hub** on the Desktop. Log: `/tmp/luckee-hub-launcher.log`.

### Option B — CLI

```bash
cd luckee-hub && npm link
luckeehub
```

### Option C — Manual (two terminals)

```bash
# Terminal 1 — hub Express
cd luckee-hub-express-server
PORT=3001 npm run dev

# Terminal 2 — hub Web
cd luckee-hub
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Health checks

```bash
curl -s http://127.0.0.1:3001/api/health
```

Hub Express binds **`127.0.0.1` only** in development (ADR 008). Do not expose it to LAN without additional auth.

---

## Step 5 — Per-project setup

For each catalog project you want on this machine:

### 5a — Enable and clone (**Setup**)

1. Open **Project detail → Overview → Setup**.
2. Confirm **hub.local.json** / paths (or run **Setup** from the projects list).
3. **Setup** job: create `{luckeeParent}/luckee/{projectId}/`, clone repos from registry, write `{projectId}.code-workspace`, run `npm install` per repo (ADR 012).

Idempotent: existing `.git` → skip clone; existing `node_modules` → skip install.

### 5b — Local PostgreSQL (if `localDatabase` in registry)

**Project detail → Local database**

| Step id | What it does |
|---------|----------------|
| `postgres-install` | `brew install postgresql@16` (if configured) |
| `postgres-start` | `brew services start postgresql@16` |
| `postgres` | Verify `host:port` (optional **Stop Postgres**) |
| `createdb` | Create `databaseName` |
| `migration-{file}` | `psql -f` each file in order |
| `env` | Upsert `DATABASE_URL` in target repo `.env` (`express` or `envRepo`) |
| `refresh` | Re-probe status |

Use **Setup database** to run all runnable steps, or run rows individually.

Projects **without** `localDatabase` skip this tab (`supported: false`).

### 5c — Supabase (if `supabase` in registry)

**Project detail → Supabase**: paste URL, service key, database password → upsert Express `.env` → **Seed schema** runs bootstrap SQL via `psql` (ADR 013). Requires `psql` on PATH and complete keys before **Run**.

### 5d — Express env groups (OAuth, storage, etc.)

Registry `expressEnv.groups` (e.g. My Gmail Manager **Storage Express**) defines keys to fill on the detail page. Secrets live only in the **cloned project `.env`**, not in `hub.local.json`.

Example keys for dispatcher + remote storage: `STORAGE_EXPRESS_URL`, `STORAGE_EXPRESS_SECRET`, `STORAGE_MODE`, Google OAuth vars — see each project’s `.env.example`.

### 5e — Run / Close

- **Run**: ensures local DB and/or Supabase gates pass, then spawns embedded terminals (Express, Web, and **storage-express** when registered).
- **Close**: kills project PTYs; Postgres stop rules per ADR 011.

---

## Step 6 — Optional services and workflows

### Storage Express (e.g. My Gmail Manager)

Registry may include `repoType: "storage-express"`. Setup clones a third repo; **Run** starts it on its registry port (e.g. `3010`). Local **Postgres + migrations** often target the storage repo when `localDatabase.envRepo` is `"storage-express"`.

Multi-machine layouts (canonical DB on one host, dispatcher on another):

- **[My Gmail Manager — two Macs](./my-gmail-manager-two-device-deployment.md)** (storage host + dispatcher host, hub paths, secrets, ports)
- Product repos: `STUDIO-DISPATCHER-SETUP.md`, `STORAGE-HOST-SETUP.md`, `TWO-DEVICE-DEPLOYMENT.md` under `my-gmail-manager/`

The hub still expects Postgres on the machine where you run **storage-express** locally.

### Cursor workspace

Setup writes `{projectId}.code-workspace` under the project folder. **Open Cursor** uses `workspaceFile` + `cursorBin` from `hub.local.json`.

### Chrome

**Open Chrome** uses the project’s web URL (optional registry `webOpenPath`, e.g. `/dashboard`).

### Embedded terminals

WebSocket terminal stream requires hub Express running; job logs for Setup live under `/tmp/luckee-hub/jobs/` and `/tmp/luckee-hub/logs/`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| `command not found: createdb` / `psql` | Postgres clients not on PATH | Step 1 PATH export; restart shell |
| Setup fails immediately | `luckeeParent` unset | Step 3 — pick folder in hub UI |
| `npm install` fails in Setup | Wrong Node version | Step 2 — fix `nvmSh`, install LTS |
| Local database steps blocked | Postgres not running | Start service; verify with `psql` |
| Hub UI can’t reach API | Express not on `:3001` | Step 4; check `NEXT_PUBLIC_API_URL` |
| Run fails before terminals | DB or Supabase gate | Complete Local database / Supabase tabs |
| Port already in use | Another dev server | **Close** project or free port in `hub.local.json` |

---

## Related references in this repo

| Resource | Purpose |
|----------|---------|
| `data/projects.registry.json` | Ports, `localDatabase`, `supabase`, `expressEnv`, repos |
| `hub.local.json.example` | Machine paths and `nvmSh` |
| `data/local-database-hub-session.json` | Hub Postgres session (consumers / started-by-hub) |
| `.cursor/architecture/008-local-launcher-service.md` | Launcher, jobs, security |
| `.cursor/architecture/011-local-database-service.md` | Local DB steps and Run/Close |
| `.cursor/architecture/012-project-setup-into-luckee.md` | Setup clone layout |
| `.cursor/architecture/013-supabase-config-service.md` | Supabase tab |
| `.cursor/architecture/021-storage-express-launcher.md` | Storage repo + `envRepo` |
| [my-gmail-manager-two-device-deployment.md](./my-gmail-manager-two-device-deployment.md) | Gmail: studio storage + laptop dispatcher |

Product-specific install notes (dispatcher vs storage host) remain in each catalog repo’s markdown files.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-10-16 | Initial manual; Step 1 PostgreSQL |
| 2026-10-16 | Full steps 2–6, checklist table, PATH/troubleshooting, hub step ids |
| 2026-10-16 | Gmail two-device deployment guide |
