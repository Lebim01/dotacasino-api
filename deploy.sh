#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/app"

# Servicios systemd (ajusta si tus nombres difieren)
SVC_ADMIN="nest-admin"
SVC_CLIENT="nest-client"
SVC_BACKOFFICE="nest-backoffice"

echo "==> Git pull"
git pull

echo "==> Instalando dependencias (si cambia lockfile, esto es clave)"
# Si prefieres no reinstalar siempre, comenta esta línea.
yarn install --frozen-lockfile || yarn install

echo "==> Build (admin-api -> client-api -> backoffice-api)"
yarn nest build admin-api
yarn nest build client-api
yarn nest build backoffice-api

echo "==> Reiniciando servicios"
sudo systemctl restart "$SVC_ADMIN" "$SVC_CLIENT" "$SVC_BACKOFFICE"

echo "==> Status"
sudo systemctl --no-pager --full status "$SVC_ADMIN" "$SVC_CLIENT" "$SVC_BACKOFFICE"

echo "✅ Deploy completo"
