#!/usr/bin/env bash
# Stop, recreate, and start ARWeb containers from the latest built images.
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"

COMPOSE_FILE="docker-compose.ragstack.yml"

echo ">>> Restarting ARWeb containers..."
docker compose -f "${COMPOSE_FILE}" up -d --force-recreate

echo
echo ">>> Status:"
docker compose -f "${COMPOSE_FILE}" ps
