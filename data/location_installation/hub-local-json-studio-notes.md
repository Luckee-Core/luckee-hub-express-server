# `hub.local.json` — studio paths (Phase 1)

File lives at `luckee-hub-express-server/hub.local.json` (gitignored). Example baseline: `hub.local.json.example`.

## Avoid duplicate clones

Hub **Setup** clones to `{luckeeParent}/luckee/{projectId}/…`. If you develop under `~/github/my-gmail-manager/` or `~/luckee/local-scheduler/`, override paths in `projects`:

```json
{
  "luckeeParent": "/Users/you/github",
  "nvmSh": "/opt/homebrew/opt/nvm/nvm.sh",
  "projects": {
    "my-gmail-manager": {
      "enabled": true,
      "webDir": "/Users/you/github/my-gmail-manager/my-gmail-manager-web",
      "expressDir": "/Users/you/github/my-gmail-manager/my-gmail-manager-express-server",
      "storageExpressDir": "/Users/you/github/my-gmail-manager/my-gmail-manager-storage-express-server",
      "webPortStart": 3053
    },
    "local-scheduler": {
      "enabled": true,
      "webDir": "/Users/you/luckee/local-scheduler/local-scheduler-web",
      "expressDir": "/Users/you/luckee/local-scheduler/local-scheduler-express-server",
      "webPortStart": 3023
    }
  }
}
```

## Ports

| Project | Express | Web |
|---------|---------|-----|
| `my-gmail-manager` | 3052 (registry) | 3053 |
| `local-scheduler` | **3022** (registry; set `PORT=3022` in scheduler `.env`) | 3023 |

Hub **Run** spawns dev servers; it does not install scheduler **launchd**. For 24/7 cron on studio, use `local-scheduler-express-server/scripts/install-launchd.sh`.

## After edits

1. Restart hub Express (`PORT=3001 npm run dev` or desktop launcher).
2. **Close** → **Run** affected projects so terminals reload `.env` from these directories.

See [my-gmail-manager-two-device-deployment.md](./my-gmail-manager-two-device-deployment.md#one-checkout-tree-per-machine-critical).
