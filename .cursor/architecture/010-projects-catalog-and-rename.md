# 010 — Projects catalog and rename

## Status

Accepted

## Context

The local dev hub catalog was named "studios" (`/api/studios`, `studios.registry.json`). Product language is **projects** — each OSS app is a project row with a detail control plane.

## Decision

- Committed catalog: `data/projects.registry.json`
- Machine paths: `hub.local.json` → `projects` (not `studios`)
- HTTP: `GET /api/projects`, launcher under `/api/launcher/projects/:id/*`
- Types: `ProjectRegistryEntry`, `HubProject`, `MergedProjectConfig`
- Utils: `src/utils/projects/`
- Service: `src/services/projects/`
- Terminal/job payloads use `projectId` (not `studioId`)

## Related

- [008 – Local launcher service](./008-local-launcher-service.md)
- [011 – Local database service](./011-local-database-service.md)
