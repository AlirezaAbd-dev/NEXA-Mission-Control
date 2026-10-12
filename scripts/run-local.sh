#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v cargo >/dev/null
command -v pnpm >/dev/null
if [ ! -d client/node_modules ]; then
  (cd client && pnpm install --frozen-lockfile)
fi
(cd client && node node_modules/typescript/bin/tsc -b && node node_modules/vite/bin/vite.js build)
(cd server && cargo build --locked)
export HOST=127.0.0.1 PORT=8000
export MISSION_CONTROL_DEMO="${MISSION_CONTROL_DEMO:-1}"
export JWT_SECRET="${JWT_SECRET:-$(python3 -c 'import secrets;print(secrets.token_hex(32))')}"
(cd server && exec ./target/debug/taskflow-server) &
mission_api_pid=$!
(cd client && exec node node_modules/vite/bin/vite.js --host 127.0.0.1) &
mission_client_pid=$!
trap 'kill "$mission_api_pid" "$mission_client_pid" 2>/dev/null || true' EXIT INT TERM
printf 'Mission Control: http://localhost:3000\nLocal demo: commander@nexa.internal / Password123!\n'
wait "$mission_api_pid" "$mission_client_pid"
