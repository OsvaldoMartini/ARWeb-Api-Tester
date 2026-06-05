#!/usr/bin/env bash
# Build arweb-api (Node sidecar) and arweb-web (nginx + React) images.
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"

COMPOSE_FILE="docker-compose.ragstack.yml"

echo ">>> Building ARWeb images..."
docker compose -f "${COMPOSE_FILE}" build --progress=plain

echo
echo ">>> Images built:"
docker images | grep -E "arweb|IMAGE"

echo
echo ">>> Run ./restart.sh to start / apply changes."
