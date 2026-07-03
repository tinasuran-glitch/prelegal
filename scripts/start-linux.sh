#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

docker build -t prelegal .

ENV_FILE_ARGS=()
if [ -f .env ]; then
  ENV_FILE_ARGS=(--env-file .env)
fi

docker rm -f prelegal >/dev/null 2>&1 || true
docker run -d --name prelegal -p 8000:8000 -p 3000:3000 "${ENV_FILE_ARGS[@]}" prelegal

echo "Prelegal is starting."
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
