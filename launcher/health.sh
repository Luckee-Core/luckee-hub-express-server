#!/bin/zsh

express_health_ok() {
  local response
  response="$(/usr/bin/curl -fsS "$API_HEALTH_URL" 2>/dev/null)" || return 1
  echo "$response" | /usr/bin/grep -qE '"status"[[:space:]]*:[[:space:]]*"ok"'
}

wait_for_express_health() {
  echo "Waiting for Express at ${API_HEALTH_URL} (up to ${EXPRESS_WAIT_SECONDS}s)..." >&2
  local i=0
  while [[ "$i" -lt "$EXPRESS_WAIT_SECONDS" ]]; do
    if port_listening "$API_PORT"; then
      if express_health_ok || url_responds "$API_HEALTH_URL"; then
        echo "Express ready." >&2
        return 0
      fi
    fi
    sleep 1
    i=$((i + 1))
  done
  echo "Express health check timed out." >&2
  return 1
}
