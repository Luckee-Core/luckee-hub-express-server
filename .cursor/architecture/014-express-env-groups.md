# 014 — Express env groups (AI / Maps)

## Status

Accepted

## Context

Lead Studio Express needs more than Supabase keys (Anthropic, Google Maps). Hub should upsert those into the same express `.env` via project-detail tabs, without storing secrets in Hub Redux long-term.

## Decision

### Registry

Optional `expressEnv.groups` on a registry entry. Each group has `label` + `keys[]`.

Lead Studio groups: `ai` (`ANTHROPIC_API_KEY` only — model is Haiku in Express), `google-maps`. An `email` group may exist on other products; Lead Studio does not ship outbound send.

List projects exposes `expressEnvGroupIds: Object.keys(groups)`.

### Routes

| Method | Path | Role |
|--------|------|------|
| GET | `/api/projects/:id/express-env/:groupId` | Probe: booleans per key + path |
| POST | `/api/projects/:id/express-env/:groupId` | Body: `Record<envKey, string>` — upsert non-empty values only |

### Storage

Same as Supabase config: secrets only in express `.env`; Hub keeps form drafts + probe booleans.

## Related

- [013 – Supabase config service](./013-supabase-config-service.md)
