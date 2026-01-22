#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/app-old"

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

echo "==> Reiniciando servicios"
sudo systemctl restart "$SVC_ADMIN-tbs" "$SVC_CLIENT-tbs"

echo "==> Status"
sudo systemctl --no-pager --full status "$SVC_ADMIN-tbs" "$SVC_CLIENT-tbs"

echo "✅ Deploy completo"
