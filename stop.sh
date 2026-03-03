#!/usr/bin/env bash
# Reflect Health Demo — Stop all services
ROOT="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="$ROOT/mongodb_local/data"

echo "Stopping Reflect Health demo..."

[ -f /tmp/reflect_frontend.pid ] && kill "$(cat /tmp/reflect_frontend.pid)" 2>/dev/null && rm /tmp/reflect_frontend.pid
[ -f /tmp/reflect_backend.pid ]  && kill "$(cat /tmp/reflect_backend.pid)"  2>/dev/null && rm /tmp/reflect_backend.pid

# Stop mongod
"$ROOT/mongodb_local/mongodb/bin/mongod" --dbpath "$DATA_DIR" --shutdown 2>/dev/null || \
  lsof -ti :27017 | xargs kill -9 2>/dev/null || true

echo "Done."
