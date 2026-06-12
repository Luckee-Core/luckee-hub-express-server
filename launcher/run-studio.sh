#!/bin/zsh
#
# Parameterized studio launcher. Env vars set by luckee-hub-express before spawn.
# OPEN_WORKSPACE=1|0  OPEN_CHROME=1|0  START_SERVERS=1|0

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/load.sh"

on_launcher_error() {
  local code=$?
  write_job_status "failed" "Launcher exited with code ${code}"
  exit "$code"
}
trap on_launcher_error ERR

bootstrap_launcher
write_job_status "running" "Launcher started"

if ! validate_studio_paths; then
  write_job_status "failed" "Studio paths invalid"
  exit 1
fi

if [[ "$START_SERVERS" -eq 1 ]]; then
  if [[ -n "$WEB_DIR" ]] && ! validate_dependencies "$WEB_DIR"; then
    write_job_status "failed" "node_modules missing in web repo"
    exit 1
  fi
  if [[ -n "$EXPRESS_DIR" ]] && ! validate_dependencies "$EXPRESS_DIR"; then
    write_job_status "failed" "node_modules missing in express repo"
    exit 1
  fi
  if ! validate_node_tooling; then
    write_job_status "failed" "node/npm not found"
    exit 1
  fi

  record_existing_next_ports
  start_studio_servers || {
    write_job_status "failed" "Failed to start servers"
    exit 1
  }
fi

WEB_URL=""
if [[ -n "$WEB_DIR" ]]; then
  WEB_URL="$(resolve_next_url "$([[ "$START_SERVERS" -eq 1 ]] && echo true || echo false)" || true)"
  if [[ -n "$WEB_URL" ]]; then
    WEB_URL="$(
      echo "$WEB_URL" \
        | /usr/bin/grep -Eo 'http://(localhost|127\.0\.0\.1):[0-9]+' \
        | /usr/bin/tail -1
    )" || WEB_URL=""
  fi
  [[ -n "$WEB_URL" ]] && printf '%s\n' "$WEB_URL" >"$WEB_URL_FILE"
fi

if [[ "$OPEN_CHROME" -eq 1 && -z "$WEB_URL" ]]; then
  WEB_URL="$(cat "$WEB_URL_FILE" 2>/dev/null || true)"
fi

if [[ "$OPEN_CHROME" -eq 1 && -z "$WEB_URL" ]]; then
  write_job_status "failed" "Could not detect web URL"
  exit 1
fi

open_dev_ui "$WEB_URL" || {
  if [[ "$OPEN_WORKSPACE" -eq 1 ]]; then
    write_job_status "failed" "Failed to open workspace"
    exit 1
  fi
}

trap - ERR
write_job_status "completed" "Done" "$WEB_URL"
exit 0
