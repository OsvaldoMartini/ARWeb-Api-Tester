#!/usr/bin/env bash
# Build arweb-api (Node sidecar) and arweb-web (nginx + React) images.
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"

COMPOSE_FILE="docker-compose.ragstack.yml"

NO_CACHE=""
[ "${1:-}" = "--no-cache" ] && NO_CACHE="--no-cache"

echo ">>> Building ARWeb images${NO_CACHE:+ (no cache)}..."
docker compose -f "${COMPOSE_FILE}" build --progress=plain ${NO_CACHE}

echo
echo ">>> Images built:"
docker images | grep -E "arweb|IMAGE"

echo
echo ">>> Run ./restart.sh to start / apply changes."
