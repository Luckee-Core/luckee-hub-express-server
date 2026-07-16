# 012 — Project setup into luckee/

## Status

Accepted

## Context

Luckee Hub lists catalog projects but users previously had to manually clone repos, run `npm install`, and edit `hub.local.json`. The product goal is that someone can install the hub and prepare a project without opening repo code.

## Decision

### Path convention

All hub-managed clones live under:

```text
{luckeeParent}/luckee/{projectId}/{repoName}
```

Example:

```text
/Users/matthewruiz/github/luckee/mac-manager/mac-manager-web
/Users/matthewruiz/github/luckee/mac-manager/mac-manager-express-server
```

- `luckeeParent` is machine-specific config in `hub.local.json` (parent of the required `luckee/` folder).
- Legacy `workspaceParent` is read as an alias when `luckeeParent` is absent.

### Setup flow

`POST /api/launcher/projects/:id/setup` starts an async job that:

1. Requires `luckeeParent` (400 if unset).
2. Creates `{luckeeParent}/luckee` and `{luckeeParent}/luckee/{projectId}`.
3. Clones each registry repo from `Luckee-Core` (or `githubOrg` override).
4. Writes `hub.local.json` project paths before install (so failed install still leaves `cloned` status).
5. Runs `npm install` in each repo using the same `nvmSh` prefix as embedded terminals.

Idempotency:

- Existing `.git` directory → skip clone.
- Existing `node_modules` → skip install.
- Non-empty non-git directory → 400.

### Hub config API

- `GET /api/projects/hub-config` — read `luckeeParent`, `githubOrg`
- `PUT /api/projects/hub-config` — set `luckeeParent` (absolute path required)
- `POST /api/projects/hub-config/pick-folder` — macOS Finder folder picker; saves `luckeeParent`

### Job polling

Setup reuses launcher job files under `/tmp/luckee-hub/jobs/` and `GET /api/launcher/jobs/:jobId`.

Each setup job includes structured `steps[]` (clone + install per registry repo). Stale `"running"` jobs older than 2 minutes are marked failed on retry so Setup can start fresh.

Shell commands for install use `runNvmShellCommand` which drains stdout/stderr to avoid pipe deadlocks during `npm install`.

## Related

- [008 – Local launcher service](./008-local-launcher-service.md)
- [010 – Projects catalog](./010-projects-catalog-and-rename.md)
