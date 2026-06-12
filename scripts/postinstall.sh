#!/bin/sh
# node-pty prebuild spawn-helper is sometimes installed without +x; PTY spawn fails until fixed.
set -e
HELPER="node_modules/node-pty/prebuilds/$(uname -s | tr '[:upper:]' '[:lower:]' | sed 's/darwin/darwin/')-$(uname -m)/spawn-helper"
# Normalize platform name for node prebuild folder
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64) HELPER="node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper" ;;
  Darwin-x86_64) HELPER="node_modules/node-pty/prebuilds/darwin-x64/spawn-helper" ;;
  Linux-x86_64) HELPER="node_modules/node-pty/prebuilds/linux-x64/spawn-helper" ;;
  Linux-aarch64) HELPER="node_modules/node-pty/prebuilds/linux-arm64/spawn-helper" ;;
esac
if [ -f "$HELPER" ]; then
  chmod +x "$HELPER"
fi
