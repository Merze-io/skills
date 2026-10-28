#!/usr/bin/env bash
# Stop the verification process group. Never deletes artifacts/.
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$SKILL_DIR/run"

if [[ ! -f "$RUN_DIR/pid" ]]; then
  echo "cleanup: no recorded verification server"
  exit 0
fi

PID="$(tr -d '[:space:]' <"$RUN_DIR/pid")"
if [[ -z "$PID" ]]; then
  rm -rf "$RUN_DIR"
  echo "cleanup: removed empty pid file"
  exit 0
fi

if kill -0 "$PID" 2>/dev/null; then
  PGID="$(ps -o pgid= -p "$PID" | tr -d '[:space:]')"
  if [[ -z "$PGID" || "$PGID" == "1" ]]; then
    echo "cleanup: fail: refusing to signal process group '$PGID' for pid $PID" >&2
    exit 1
  fi
  kill -TERM -- "-$PGID" 2>/dev/null || kill -TERM "$PID" 2>/dev/null || true
  for _ in $(seq 1 10); do
    if ! kill -0 "$PID" 2>/dev/null; then
      break
    fi
    sleep 1
  done
  if kill -0 "$PID" 2>/dev/null; then
    kill -KILL -- "-$PGID" 2>/dev/null || true
    sleep 1
  fi
  if kill -0 "$PID" 2>/dev/null; then
    echo "cleanup: fail: pid $PID is still running" >&2
    exit 1
  fi
fi

rm -rf "$RUN_DIR"
echo "cleanup: stopped verification server; artifacts kept"
