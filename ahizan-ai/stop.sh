#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIDFILE="$DIR/service.pid"

if [ -f "$PIDFILE" ]; then
    PID=$(cat "$PIDFILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "[Ahizan AI] Stopping service PID $PID..."
        kill "$PID"
        rm -f "$PIDFILE"
        echo "[Ahizan AI] Stopped."
        exit 0
    fi
    rm -f "$PIDFILE"
fi

echo "[Ahizan AI] Service was not running (or no PID file found)."
