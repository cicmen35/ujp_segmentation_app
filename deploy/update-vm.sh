#!/usr/bin/env bash
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "${SCRIPT_DIR}/.." && pwd)"
BACKEND_SERVICE="${BACKEND_SERVICE:-segment-web-app-backend}"

usage() {
  cat <<'EOF'
Usage: ./deploy/update-vm.sh <frontend|backend|all>

frontend  Build the frontend and reload nginx.
backend   Restart the backend service.
all       Build the frontend, restart the backend service, and reload nginx.

Optional env:
  BACKEND_SERVICE   Override the backend systemd service name.
EOF
}

reload_nginx() {
  sudo systemctl reload nginx
}

restart_backend() {
  sudo systemctl restart "${BACKEND_SERVICE}"
}

build_frontend() {
  cd "${REPO_ROOT}/frontend"

  if [ -f "${SCRIPT_DIR}/frontend.env.production" ]; then
    set -a
    . "${SCRIPT_DIR}/frontend.env.production"
    set +a
  fi

  VITE_API_BASE_URL="${VITE_API_BASE_URL:-/api}" npm run build
}

if [ "$#" -ne 1 ]; then
  usage
  exit 1
fi

case "$1" in
  frontend)
    build_frontend
    reload_nginx
    ;;
  backend)
    restart_backend
    ;;
  all)
    build_frontend
    restart_backend
    reload_nginx
    ;;
  *)
    usage
    exit 1
    ;;
esac
