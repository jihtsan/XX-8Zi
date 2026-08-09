#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${PROJECT_ROOT}/.venv"
API_DIR="${PROJECT_ROOT}/apps/api"
WEB_DIR="${PROJECT_ROOT}/apps/web"

if command -v python3.14 >/dev/null 2>&1; then
  PYTHON_BIN="python3.14"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
else
  echo "未找到 Python 3.11 或更高版本，请先安装 Python。" >&2
  exit 1
fi

if [[ ! -x "${VENV_DIR}/bin/python" ]]; then
  "${PYTHON_BIN}" -m venv "${VENV_DIR}"
fi

"${VENV_DIR}/bin/python" -m pip install --disable-pip-version-check -e "${API_DIR}"

echo "API:  http://127.0.0.1:8000"
echo "Web:  http://127.0.0.1:3000"

"${VENV_DIR}/bin/python" -m uvicorn app.main:app \
  --app-dir "${API_DIR}" \
  --host 127.0.0.1 \
  --port 8000 &
API_PID=$!

cleanup() {
  if kill -0 "${API_PID}" >/dev/null 2>&1; then
    kill "${API_PID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

cd "${WEB_DIR}"
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://127.0.0.1:8000/api/v1}"

if command -v pnpm >/dev/null 2>&1; then
  if [[ ! -d node_modules ]]; then pnpm install; fi
  pnpm run dev
elif command -v corepack >/dev/null 2>&1; then
  if [[ ! -d node_modules ]]; then corepack pnpm install; fi
  corepack pnpm run dev
elif command -v npm >/dev/null 2>&1; then
  if [[ ! -d node_modules ]]; then npm install; fi
  npm run dev
else
  echo "未找到 Node.js 包管理器，请安装 Node.js 22 和 pnpm。" >&2
  exit 1
fi
