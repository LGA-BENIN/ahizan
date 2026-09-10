#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIDFILE="$DIR/service.pid"
LOGFILE="$DIR/service.log"

if [ -f "$PIDFILE" ]; then
    PID=$(cat "$PIDFILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "[Ahizan AI] Service is already running with PID $PID"
        exit 0
    fi
fi

NODE_BIN="/home/fernando/.antigravity-ide-server/bin/2.5.5-ecfbad74d93962fc8ca485d93ab9b4f3d4cb6cf8/node"
if [ ! -f "$NODE_BIN" ]; then
    NODE_BIN=$(which node 2>/dev/null || echo "/home/elidja/.local/bin/node")
fi

echo "[Ahizan AI] Starting Ahizan AI V2 Service on port 3005..."
nohup "$NODE_BIN" "$DIR/dist/index.js" > "$LOGFILE" 2>&1 &
PID=$!
echo $PID > "$PIDFILE"
echo "[Ahizan AI] Started with PID $PID. Logs at $LOGFILE"
