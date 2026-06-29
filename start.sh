#!/usr/bin/env bash
# 一鍵啟動 Strategy Board 開發環境:backend(:8000)+ frontend(:5173)。
#   用法:./start.sh
#   結束:Ctrl+C(會一併關閉兩個 server)
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

# ── 前置檢查 ──────────────────────────────────────────────────────────────
if [[ ! -d "$BACKEND/.venv" ]]; then
  echo "✗ 找不到 $BACKEND/.venv" >&2
  echo "  先建立:cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt" >&2
  exit 1
fi
if [[ ! -d "$FRONTEND/node_modules" ]]; then
  echo "✗ 找不到 $FRONTEND/node_modules" >&2
  echo "  先安裝:cd frontend && pnpm install" >&2
  exit 1
fi

# ── port 占用檢查(避免與既有 server 衝突)──────────────────────────────────
for port in 8000 5173; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "✗ port $port 已被占用,請先關閉占用的 process(lsof -nP -iTCP:$port -sTCP:LISTEN)" >&2
    exit 1
  fi
done

# ── 清理:Ctrl+C / 結束時一併關閉子 process ────────────────────────────────
pids=()
cleanup() {
  trap - INT TERM EXIT
  echo ""
  echo "→ 關閉 server..."
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  echo "✓ 已全部關閉"
}
trap cleanup INT TERM EXIT

# ── backend ───────────────────────────────────────────────────────────────
echo "→ 啟動 backend  http://localhost:8000"
(
  cd "$BACKEND" || exit 1
  # shellcheck disable=SC1091
  source .venv/bin/activate
  exec uvicorn app.main:app --reload --port 8000
) &
pids+=($!)

# ── frontend ──────────────────────────────────────────────────────────────
echo "→ 啟動 frontend http://localhost:5173"
(
  cd "$FRONTEND" || exit 1
  exec pnpm dev
) &
pids+=($!)

echo ""
echo "Strategy Board 開發環境啟動中(Ctrl+C 結束)"
echo "  backend  : http://localhost:8000"
echo "  frontend : http://localhost:5173"
echo ""

wait
