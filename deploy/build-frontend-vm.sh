#!/usr/bin/env bash
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}/frontend"

if [ -f "${SCRIPT_DIR}/frontend.env.production" ]; then
  set -a
  . "${SCRIPT_DIR}/frontend.env.production"
  set +a
fi

VITE_API_BASE_URL="${VITE_API_BASE_URL:-/api}" npm run build
