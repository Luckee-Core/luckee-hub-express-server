#!/bin/zsh

validate_node_tooling() {
  command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1
}

validate_dependencies() {
  local dir="$1"
  [[ -d "${dir}/node_modules" ]]
}

validate_studio_paths() {
  if [[ -n "$WEB_DIR" && ! -d "$WEB_DIR" ]]; then
    echo "Web dir missing: ${WEB_DIR}" >&2
    return 1
  fi
  if [[ -n "$EXPRESS_DIR" && ! -d "$EXPRESS_DIR" ]]; then
    echo "Express dir missing: ${EXPRESS_DIR}" >&2
    return 1
  fi
  return 0
}
