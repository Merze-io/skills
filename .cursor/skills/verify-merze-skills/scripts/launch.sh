#!/usr/bin/env bash
# Start one Merze Skills Astro process for verification on an isolated port.
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$SKILL_DIR/../../.." && pwd)"
SITE_ROOT="$REPO_ROOT/site"
RUN_DIR="$SKILL_DIR/run"
NODE_BIN="/usr/local/opt/node@22/bin"
NODE22="$NODE_BIN/node"
NPM22="$NODE_BIN/npm"
UI_PORT=4322

mkdir -p "$RUN_DIR" "$SKILL_DIR/artifacts"

if [[ ! -x "$NODE22" || ! -x "$NPM22" ]]; then
  if command -v node >/dev/null && command -v npm >/dev/null; then
    NODE22="$(command -v node)"
    NPM22="$(command -v npm)"
    NODE_BIN="$(dirname "$NODE22")"
  else
    echo "launch: fail: Node/npm not found" >&2
    exit 1
  fi
fi

if [[ ! -d "$SITE_ROOT/node_modules" ]]; then
  echo "launch: installing site dependencies…"
  (cd "$SITE_ROOT" && "$NPM22" ci)
fi

port_busy() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

if port_busy "$UI_PORT"; then
  echo "launch: refuse: UI port $UI_PORT is already in use. Do not attach to an existing catalog." >&2
  exit 1
fi

if [[ -f "$RUN_DIR/pid" ]]; then
  existing="$(cat "$RUN_DIR/pid")"
  if [[ -n "$existing" ]] && kill -0 "$existing" 2>/dev/null; then
    echo "launch: refuse: verification server pid $existing is already recorded" >&2
    exit 1
  fi
fi

LOG="$RUN_DIR/dev.log"
: >"$LOG"

PID="$("$NODE22" --input-type=module -e '
import { spawn } from "node:child_process";
import { openSync } from "node:fs";

const logFd = openSync(process.argv[1], "a");
const npmBin = process.argv[2];
const siteRoot = process.argv[3];
const pathPrefix = process.argv[4];
const uiPort = process.argv[5];

const env = { ...process.env, PATH: `${pathPrefix}:${process.env.PATH || ""}` };
delete env.PORT;

const child = spawn(
  npmBin,
  ["run", "dev", "--", "--port", uiPort, "--host", "localhost", "--strictPort"],
  {
    cwd: siteRoot,
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env,
  },
);
child.unref();
process.stdout.write(String(child.pid));
' "$LOG" "$NPM22" "$SITE_ROOT" "$NODE_BIN" "$UI_PORT")"

printf '%s\n' "$PID" >"$RUN_DIR/pid"
printf '%s\n' "$UI_PORT" >"$RUN_DIR/ui-port"

for _ in $(seq 1 90); do
  if curl -sf "http://localhost:${UI_PORT}/" | grep -qi "Merze Skills"; then
    echo "ready ui=http://localhost:${UI_PORT} pid=$PID"
    exit 0
  fi
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "launch: fail: server process exited. See $LOG" >&2
    tail -n 40 "$LOG" >&2 || true
    exit 1
  fi
  sleep 1
done

echo "launch: fail: timed out waiting for UI. See $LOG" >&2
tail -n 40 "$LOG" >&2 || true
exit 1
