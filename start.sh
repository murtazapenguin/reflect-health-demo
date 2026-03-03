#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Reflect Health Demo — Local Startup Script
# Usage: ./start.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
MONGODB_DIR="$ROOT/mongodb_local"
MONGOD="$MONGODB_DIR/mongodb/bin/mongod"
DATA_DIR="$MONGODB_DIR/data"
LOG_FILE="$MONGODB_DIR/mongod.log"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
VENV_DIR="$BACKEND_DIR/.venv"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log()  { echo -e "${BLUE}[start.sh]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
die()  { echo -e "${RED}[✗] $1${NC}"; exit 1; }

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Reflect Health Voice AI Demo — Local Startup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── 0. Prereq checks ─────────────────────────────────────────────────────────
log "Checking prerequisites..."

PYTHON=""
for cmd in python3.12 python3.11 python3; do
  if command -v "$cmd" &>/dev/null; then
    VER=$("$cmd" -c "import sys; print(sys.version_info[:2])")
    MAJOR=$("$cmd" -c "import sys; print(sys.version_info.major)")
    MINOR=$("$cmd" -c "import sys; print(sys.version_info.minor)")
    if [ "$MAJOR" -ge 3 ] && [ "$MINOR" -ge 10 ]; then
      PYTHON="$cmd"
      break
    fi
  fi
done
[ -z "$PYTHON" ] && die "Python 3.10+ not found. Install via: brew install python@3.11"
ok "Python: $($PYTHON --version)"

command -v node &>/dev/null || die "Node.js not found. Install via: brew install node"
ok "Node: $(node --version)"

[ -x "$MONGOD" ] || die "mongod not found at $MONGOD"
ok "mongod: ready"

# ── 1. Stop any stale processes on our ports ─────────────────────────────────
log "Freeing ports 27017, 8000, 5173..."
lsof -ti :27017 | xargs kill -9 2>/dev/null || true
lsof -ti :8000  | xargs kill -9 2>/dev/null || true
lsof -ti :5173  | xargs kill -9 2>/dev/null || true
sleep 1
ok "Ports cleared"

# ── 2. Start MongoDB ──────────────────────────────────────────────────────────
log "Starting MongoDB..."
mkdir -p "$DATA_DIR"
"$MONGOD" \
  --dbpath "$DATA_DIR" \
  --logpath "$LOG_FILE" \
  --port 27017 \
  --fork \
  --quiet
# Wait for it to be ready
for i in {1..15}; do
  if "$ROOT/mongodb_local/mongodb/bin/mongosh" --quiet --eval "db.runCommand({ping:1})" &>/dev/null 2>&1; then
    ok "MongoDB started (pid: $(cat "$DATA_DIR/mongod.lock" 2>/dev/null || echo '?'))"
    break
  fi
  sleep 1
  [ $i -eq 15 ] && warn "MongoDB may still be starting — continuing anyway"
done

# ── 3. Python venv + deps ────────────────────────────────────────────────────
log "Setting up Python virtual environment..."
if [ ! -d "$VENV_DIR" ]; then
  "$PYTHON" -m venv "$VENV_DIR"
  ok "venv created"
else
  ok "venv exists"
fi

log "Installing backend dependencies..."
"$VENV_DIR/bin/pip" install -q --upgrade pip
"$VENV_DIR/bin/pip" install -q -r "$BACKEND_DIR/requirements.txt"
ok "Backend deps installed"

# ── 4. Seed database ─────────────────────────────────────────────────────────
log "Seeding database..."
cd "$BACKEND_DIR"
"$VENV_DIR/bin/python" -m seed_data 2>&1 | grep -E "(Seeding|complete|Error)" || true
ok "Database seeded"

# ── 5. Start backend ──────────────────────────────────────────────────────────
log "Starting FastAPI backend on :8000..."
cd "$BACKEND_DIR"
"$VENV_DIR/bin/uvicorn" app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --reload \
  --log-level warning \
  > /tmp/reflect_backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/reflect_backend.pid

# Wait for backend to be ready
for i in {1..20}; do
  if curl -s http://localhost:8000/health &>/dev/null 2>&1; then
    ok "Backend started (pid: $BACKEND_PID)"
    break
  fi
  sleep 1
  [ $i -eq 20 ] && warn "Backend may still be starting — check /tmp/reflect_backend.log"
done

# ── 6. Frontend deps + start ──────────────────────────────────────────────────
log "Installing frontend dependencies (first run only)..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
  npm install --silent
  ok "Frontend deps installed"
else
  ok "Frontend deps already installed"
fi

log "Starting Vite frontend on :5173..."
npm run dev -- --host 0.0.0.0 > /tmp/reflect_frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > /tmp/reflect_frontend.pid

# Wait for frontend
sleep 4

# ── 7. Done ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Everything is running!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Dashboard:   ${BLUE}http://localhost:5173${NC}"
echo -e "  Backend API: ${BLUE}http://localhost:8000/docs${NC}"
echo -e "  Login:       ${YELLOW}admin@reflecthealth.com / demo2026${NC}"
echo ""
echo -e "  Logs:        tail -f /tmp/reflect_backend.log"
echo -e "               tail -f /tmp/reflect_frontend.log"
echo ""
echo -e "  To stop:     ${RED}./stop.sh${NC}"
echo ""

# Keep the script alive (trapping Ctrl+C)
cleanup() {
  echo ""
  log "Shutting down..."
  kill $FRONTEND_PID 2>/dev/null || true
  kill $BACKEND_PID 2>/dev/null || true
  "$ROOT/mongodb_local/mongodb/bin/mongod" --dbpath "$DATA_DIR" --shutdown 2>/dev/null || true
  ok "Stopped."
  exit 0
}
trap cleanup INT TERM

wait $FRONTEND_PID 2>/dev/null
