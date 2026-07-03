#!/usr/bin/env bash
set -euo pipefail

cd /app/backend
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cd /app/frontend
npm run start -- --hostname 0.0.0.0 --port 3000 &
FRONTEND_PID=$!

trap 'kill -TERM "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null' TERM INT

wait -n "$BACKEND_PID" "$FRONTEND_PID"
exit $?
