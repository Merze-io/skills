#!/usr/bin/env bash
# Read-only check that the verification instance is the one we started.
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$SKILL_DIR/run"
NODE22="/usr/local/opt/node@22/bin/node"

fail() {
  echo "doctor: fail: $*" >&2
  exit 1
}

[[ -f "$RUN_DIR/pid" ]] || fail "no run/pid; launch first"
[[ -f "$RUN_DIR/ui-port" ]] || fail "no run/ui-port; launch first"

PID="$(tr -d '[:space:]' <"$RUN_DIR/pid")"
UI_PORT="$(tr -d '[:space:]' <"$RUN_DIR/ui-port")"
[[ -n "$PID" && -n "$UI_PORT" ]] || fail "pid or ports are empty"

kill -0 "$PID" 2>/dev/null || fail "recorded pid $PID is not running"

PGID="$(ps -o pgid= -p "$PID" | tr -d '[:space:]')"
[[ -n "$PGID" ]] || fail "could not read process group for $PID"

listeners="$(lsof -nP -iTCP:"$UI_PORT" -sTCP:LISTEN -t 2>/dev/null | sort -u || true)"
[[ -n "$listeners" ]] || fail "nothing is listening on $UI_PORT"
found=0
for lp in $listeners; do
  lpg="$(ps -o pgid= -p "$lp" | tr -d '[:space:]')"
  if [[ "$lpg" == "$PGID" ]]; then
    found=1
  fi
done
[[ "$found" -eq 1 ]] || fail "port $UI_PORT is not owned by verification process group $PGID"

curl -sf "http://localhost:${UI_PORT}/" | grep -qi "Merze Skills" \
  || fail "UI does not contain Merze Skills"

if [[ -x "$NODE22" ]]; then
  node_ok=0
  while IFS= read -r member; do
    [[ -n "$member" ]] || continue
    if lsof -a -p "$member" -d txt -Fn 2>/dev/null | grep -E -q 'node@22/.*/bin/node$|bin/node$'; then
      node_ok=1
      break
    fi
  done < <(pgrep -g "$PGID" || true)
  [[ "$node_ok" -eq 1 ]] || fail "verification process group is not running node"
fi

echo "doctor: ok ui=http://localhost:${UI_PORT} pid=${PID} pgid=${PGID}"
