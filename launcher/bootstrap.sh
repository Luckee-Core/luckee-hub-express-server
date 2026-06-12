#!/bin/zsh

# Defaults from environment (set by luckee-hub-express before spawn).
STUDIO_ID="${STUDIO_ID:-}"
WEB_DIR="${WEB_DIR:-}"
EXPRESS_DIR="${EXPRESS_DIR:-}"
WORKSPACE_FILE="${WORKSPACE_FILE:-}"
API_PORT="${API_PORT:-3032}"
WEB_PORT_START="${WEB_PORT_START:-3000}"
WEB_PORT_SCAN_MAX="${WEB_PORT_SCAN_MAX:-10}"
EXPRESS_WAIT_SECONDS="${EXPRESS_WAIT_SECONDS:-180}"
NVM_SH="${NVM_SH:-$HOME/.nvm/nvm.sh}"
CURSOR_BIN="${CURSOR_BIN:-cursor}"
CURSOR_OPEN_FLAGS="${CURSOR_OPEN_FLAGS:---classic --reuse-window}"
OPEN_CHROME="${OPEN_CHROME:-0}"
OPEN_WORKSPACE="${OPEN_WORKSPACE:-0}"
START_SERVERS="${START_SERVERS:-1}"
JOB_FILE="${JOB_FILE:-}"
HUB_TMP="${HUB_TMP:-/tmp/luckee-hub}"

NEXT_DEV_LOG="${NEXT_DEV_LOG:-${HUB_TMP}/${STUDIO_ID}-next-dev.log}"
WEB_URL_FILE="${WEB_URL_FILE:-${HUB_TMP}/${STUDIO_ID}-web-url.txt}"
WORKSPACE_PATH_FILE="${WORKSPACE_PATH_FILE:-${HUB_TMP}/${STUDIO_ID}-workspace.txt}"
LAUNCHER_LOG="${LAUNCHER_LOG:-${HUB_TMP}/launcher.log}"
API_HEALTH_URL="http://127.0.0.1:${API_PORT}${HEALTH_PATH:-/api/health}"

typeset -a EXISTING_NEXT_PORTS=()

write_job_status() {
  local job_status="$1"
  local message="${2:-}"
  local web_url="${3:-}"
  [[ -n "$JOB_FILE" ]] || return 0
  mkdir -p "$(dirname "$JOB_FILE")"
  local job_id
  job_id="$(basename "$JOB_FILE" .json)"
  printf '{"jobId":"%s","status":"%s","message":"%s","webUrl":"%s","studioId":"%s","updatedAt":"%s"}\n' \
    "$job_id" "$job_status" "$message" "$web_url" "$STUDIO_ID" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >"$JOB_FILE"
}

bootstrap_launcher() {
  export NVM_DIR="$HOME/.nvm"
  if [[ -s "${NVM_SH}" ]]; then
    # shellcheck source=/dev/null
    source "$NVM_SH"
  fi
  mkdir -p "$HUB_TMP"
  if [[ -n "$WORKSPACE_FILE" ]]; then
    echo "$WORKSPACE_FILE" >"$WORKSPACE_PATH_FILE"
  fi
}
