#!/bin/zsh

run_cursor_open() {
  local cursor_bin="$1"
  local -a flags
  flags=(${=CURSOR_OPEN_FLAGS})
  "$cursor_bin" "${flags[@]}" "$WORKSPACE_FILE"
}

open_workspace() {
  local cursor_cmd="${CURSOR_BIN}"
  local candidate=""
  local -a flags

  [[ -f "$WORKSPACE_FILE" ]] || return 1

  flags=(${=CURSOR_OPEN_FLAGS})

  if [[ -n "$cursor_cmd" && -x "$cursor_cmd" ]]; then
    run_cursor_open "$cursor_cmd" && return 0
  fi

  if command -v "$cursor_cmd" >/dev/null 2>&1; then
    run_cursor_open "$cursor_cmd" && return 0
  fi

  for candidate in \
    "/Applications/Cursor.app/Contents/Resources/app/bin/cursor" \
    "/usr/local/bin/cursor" \
    "${HOME}/.local/bin/cursor"; do
    if [[ -x "$candidate" ]]; then
      run_cursor_open "$candidate" && return 0
    fi
  done

  /usr/bin/open -a Cursor --args "${flags[@]}" "$WORKSPACE_FILE" 2>/dev/null
}

open_in_chrome() {
  local url="$1"

  if /usr/bin/open -a "Google Chrome" "$url" 2>/dev/null; then
    return 0
  fi

  if /usr/bin/osascript -e "tell application \"Google Chrome\" to open location \"${url}\"" >/dev/null 2>&1; then
    return 0
  fi

  /usr/bin/open "$url" 2>/dev/null || true
}

open_dev_ui() {
  local url="$1"

  if [[ "$OPEN_WORKSPACE" -eq 1 ]]; then
    open_workspace || return 1
  fi
  if [[ "$OPEN_CHROME" -eq 1 && -n "$url" ]]; then
    open_in_chrome "$url"
  fi
}
