#!/bin/zsh
# Sources all launcher modules. Requires studio env vars set before run-studio.sh.

LAUNCHER_LIB="${LAUNCHER_LIB:-$(cd "$(dirname "$0")" && pwd)}"

source "${LAUNCHER_LIB}/bootstrap.sh"
source "${LAUNCHER_LIB}/network.sh"
source "${LAUNCHER_LIB}/health.sh"
source "${LAUNCHER_LIB}/next-url.sh"
source "${LAUNCHER_LIB}/terminal.sh"
source "${LAUNCHER_LIB}/ui.sh"
source "${LAUNCHER_LIB}/validate.sh"
