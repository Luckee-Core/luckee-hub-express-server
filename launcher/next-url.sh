#!/bin/zsh

parse_next_local_url() {
  local log="$1"
  local url=""

  [[ -f "$log" ]] || return 1

  url="$(
    /usr/bin/grep -E 'Local:' "$log" 2>/dev/null \
      | /usr/bin/grep -Eo 'http://(localhost|127\.0\.0\.1):[0-9]+' \
      | /usr/bin/head -1
  )"
  if [[ -n "$url" ]]; then
    echo "$url"
    return 0
  fi

  /usr/bin/grep -Eo 'http://(localhost|127\.0\.0\.1):[0-9]+' "$log" 2>/dev/null | /usr/bin/tail -1
}

port_from_url() {
  local url="$1"
  if [[ "$url" =~ :([0-9]+)(/|$) ]]; then
    echo "${match[1]}"
  fi
}

next_already_running() {
  local existing_url
  existing_url="$(parse_next_local_url "$NEXT_DEV_LOG" || true)"
  [[ -n "$existing_url" ]] || return 1

  local port
  port="$(port_from_url "$existing_url")"
  [[ -n "$port" ]] || return 1

  port_listening "$port" && url_responds "$existing_url"
}

scan_for_next_url() {
  local port="$WEB_PORT_START"
  local max_port=$((WEB_PORT_START + WEB_PORT_SCAN_MAX))

  while [[ "$port" -le "$max_port" ]]; do
    if port_listening "$port" && is_next_dev_server "$port"; then
      echo "http://localhost:${port}"
      return 0
    fi
    port=$((port + 1))
  done
  return 1
}

find_new_next_url() {
  local port="$WEB_PORT_START"
  local max_port=$((WEB_PORT_START + WEB_PORT_SCAN_MAX))

  while [[ "$port" -le "$max_port" ]]; do
    if port_listening "$port" && is_next_dev_server "$port" && ! port_already_tracked "$port"; then
      echo "http://localhost:${port}"
      return 0
    fi
    port=$((port + 1))
  done
  return 1
}

wait_for_next_url() {
  local log="$1"
  local url=""

  echo "Waiting for Next.js..." >&2
  for _ in {1..120}; do
    url="$(parse_next_local_url "$log" || true)"
    if [[ -n "$url" ]] && url_responds "$url"; then
      echo "$url"
      return 0
    fi

    if [[ -f "$log" ]] && /usr/bin/grep -q "Ready" "$log" 2>/dev/null; then
      url="$(find_new_next_url || true)"
      if [[ -n "$url" ]] && url_responds "$url"; then
        echo "$url"
        return 0
      fi
    fi

    sleep 1
  done
  return 1
}

resolve_next_url() {
  local start_next="$1"
  local url=""

  if [[ "$start_next" != true ]]; then
    if next_already_running; then
      parse_next_local_url "$NEXT_DEV_LOG"
      return 0
    fi
    url="$(scan_for_next_url || true)"
    [[ -n "$url" ]] && echo "$url" && return 0
    return 1
  fi

  wait_for_next_url "$NEXT_DEV_LOG"
}
