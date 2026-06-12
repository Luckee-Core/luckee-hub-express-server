#!/bin/zsh

escape_for_applescript() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  echo "$value"
}

build_express_full_cmd() {
  escape_for_applescript "cd '${EXPRESS_DIR}' && export NVM_DIR=\"\$HOME/.nvm\" && [ -s '${NVM_SH}' ] && . '${NVM_SH}' && echo '>>> ${STUDIO_ID} Express (:${API_PORT})' && npm run dev"
}

build_next_full_cmd() {
  escape_for_applescript "cd '${WEB_DIR}' && export NVM_DIR=\"\$HOME/.nvm\" && [ -s '${NVM_SH}' ] && . '${NVM_SH}' && echo '>>> ${STUDIO_ID} Web (Next.js)' && : > '${NEXT_DEV_LOG}' && npm run dev 2>&1 | tee '${NEXT_DEV_LOG}'"
}

build_web_wait_and_start_cmd() {
  escape_for_applescript "cd '${WEB_DIR}' && export NVM_DIR=\"\$HOME/.nvm\" && [ -s '${NVM_SH}' ] && . '${NVM_SH}' && echo '>>> ${STUDIO_ID} Web — waiting for Express...' && until /usr/bin/curl -fsS '${API_HEALTH_URL}' 2>/dev/null | /usr/bin/grep -qE '\"status\"[[:space:]]*:[[:space:]]*\"ok\"'; do sleep 2; done && echo '>>> Express ready. Starting Next.js...' && : > '${NEXT_DEV_LOG}' && npm run dev 2>&1 | tee '${NEXT_DEV_LOG}'"
}

run_terminal_osascript() {
  local step_name="$1"

  echo "[$(date '+%H:%M:%S')] ${STUDIO_ID}:${step_name}" >>"$LAUNCHER_LOG"
  if ! /usr/bin/osascript >>"$LAUNCHER_LOG" 2>&1; then
    echo "Terminal step failed: ${step_name}" >&2
    return 1
  fi
  return 0
}

open_terminal_window() {
  local step_name="$1"
  local full_cmd="$2"

  if ! run_terminal_osascript "$step_name" <<APPLESCRIPT
tell application "Terminal"
  activate
  do script "${full_cmd}"
end tell
APPLESCRIPT
  then
    return 1
  fi
}

start_studio_servers() {
  local start_express=false
  local start_next=false

  if [[ -n "$EXPRESS_DIR" ]] && express_health_ok; then
    echo "Express already healthy on :${API_PORT}" >&2
  elif [[ -n "$EXPRESS_DIR" ]]; then
    start_express=true
  fi

  if [[ -z "$WEB_DIR" ]]; then
    start_next=false
  elif next_already_running; then
    echo "Next.js already running" >&2
    start_next=false
  else
    start_next=true
  fi

  if [[ "$start_express" == true ]]; then
    open_terminal_window "terminal-express" "$(build_express_full_cmd)" || return 1
  fi

  if [[ "$start_next" == true ]]; then
    if [[ "$start_express" == true ]]; then
      open_terminal_window "terminal-web" "$(build_web_wait_and_start_cmd)" || return 1
    else
      open_terminal_window "terminal-web" "$(build_next_full_cmd)" || return 1
    fi
  fi

  if [[ "$start_express" == true ]]; then
    wait_for_express_health || return 1
  elif [[ -n "$EXPRESS_DIR" ]] && ! express_health_ok; then
    return 1
  fi

  return 0
}
