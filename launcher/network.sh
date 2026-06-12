#!/bin/zsh

port_listening() {
  lsof -iTCP:"$1" -sTCP:LISTEN -t >/dev/null 2>&1
}

url_responds() {
  local url="$1"
  /usr/bin/curl -fsS -o /dev/null "$url" 2>/dev/null
}

is_next_dev_server() {
  local port="$1"
  /usr/bin/curl -fsSI "http://localhost:${port}" 2>/dev/null | /usr/bin/grep -qi 'x-powered-by: Next.js'
}

port_already_tracked() {
  local port="$1"
  local tracked
  for tracked in "${EXISTING_NEXT_PORTS[@]}"; do
    [[ "$tracked" == "$port" ]] && return 0
  done
  return 1
}

record_existing_next_ports() {
  EXISTING_NEXT_PORTS=()
  local port="$WEB_PORT_START"
  local max_port=$((WEB_PORT_START + WEB_PORT_SCAN_MAX))

  while [[ "$port" -le "$max_port" ]]; do
    if port_listening "$port" && is_next_dev_server "$port"; then
      EXISTING_NEXT_PORTS+=("$port")
    fi
    port=$((port + 1))
  done
}
