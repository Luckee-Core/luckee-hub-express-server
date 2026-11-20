# 035 — Launch links (open a project at a path on its live port)

## Status

Accepted

## Context

Hub Run gives each web app the **first free port from 3000** (`resolveProjectPortsForRun`), so a project's web URL changes between runs. Other apps that link into a project (for example My Ops Tracker → Code Control's ticket build page) cannot hardcode a port, and the target may not be running at all.

Hub Express itself has a stable address (`127.0.0.1:3001`), so it is the place to resolve "open project X at path Y".

## Decision

### URL any app can link to

```text
GET http://127.0.0.1:3001/launch/:projectId?path=/some/page?query=…
```

The hub returns a small **self-contained HTML page** (inline CSS and JS, no external assets). This is a carve-out from JSON-only responses because this is a local tool and the link must work from any app. The page:

1. Calls `POST /api/launcher/projects/:id/launch`.
2. On `ready`, it calls `location.replace(webUrl + path)`.
3. On `starting`, it polls `GET /api/launcher/jobs/:jobId` every second and shows `job.message`. When the job completes with a `webUrl`, it redirects. On failure it shows the message.

`GET /launch` returns **404** for an unknown project and **400** for an invalid `path`.

### `POST /api/launcher/projects/:id/launch`

```ts
type LaunchProjectResult =
  | { status: 'ready'; webUrl: string }                    // origin, e.g. http://localhost:3002
  | { status: 'starting'; jobId: string; message: string }; // existing launcher job
```

It returns **400** when:
- the project is unknown
- the project has no web repo
- Setup isn't done: no web `node_modules`, or API dependencies missing. Launch never clones or installs.

### Probe (`probeProjectLaunchState`)

- **API up:** a listener whose cwd is under `expressDir`, found on the preferred port (from the ports file), the registry port, or any port from 3000–3999.
  - This checks **ownership, not HTTP health.** Some APIs' `/api/health` makes a gateway round trip that exceeds the hub's 0.5 s probe timeout, and a false "down" would restart a running API.
- **Web up:** `findOwnedNextWebUrl(webDir)`.
- **Storage:** needed only when the project has a storage repo **and** its data plane (`dataPlane.modeKey` in the API `.env`) is `direct`. It is then checked with `isExpressHealthy` on the catalog port.

### Start rules (`processLaunchProject`)

| API | Web | Action |
|---|---|---|
| up | up | `ready` |
| up | down | Run `targets: ['web']` (API untouched) |
| down | any | Run `targets: ['express','web']`. The web restarts too, so its injected API URL matches the API port Run picks. |

- **Storage:** when it's needed and down, `processRunStorageExpress` starts it first.
- **No extra Chrome tab:** launch runs call `processRunEmbedded(projectId, { targets, openChrome: false })`, because the launch page already is the tab. Hub Run still opens Chrome.
- **One start per project:** a second launch while a start is in flight returns the same `jobId` (`active-launch-jobs.ts`, in-process map, dropped once the job file is no longer `running`).

### Security

- **Exposure is unchanged:** the hub binds `127.0.0.1` only. Launch reaches only **registered, set-up** projects, which is the same reach as `POST /run`.
- **`path` validation** (`validateLaunchPath`): it must start with a single `/` and must not contain `\` or control characters (max 2000 characters). The redirect target is always `http://localhost:<port owned by that project's webDir>` + path, so there's no open redirect.
- **No request data reaches a shell or spawned process.**
- **Embedding the path:** the page puts `path` in a JSON script block with `<`, U+2028 and U+2029 escaped.

## Files

- `src/services/launch-page/`: router (`/launch`), handler, `render-launch-page-html.ts`
- `src/services/launcher/`: `process-launch-project.ts`, `active-launch-jobs.ts`, `routes/launch-project-handler.ts`, `LaunchProjectResult` in `types.ts`
- `src/utils/launcher/`: `validate-launch-path.ts`, `probe-project-launch-state.ts`
- `src/services/terminals/process-run-embedded.ts`: the `openChrome` option

## Consumers

- My Ops Tracker web, `src/config/code-control.ts` (`NEXT_PUBLIC_LUCKEE_HUB_URL`; see ops web ADR 047).
